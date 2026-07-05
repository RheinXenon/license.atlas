import type {
  OsadlActionNode,
  OsadlEitherGroup,
  OsadlConditionBlock,
  OsadlUseCaseTree,
  OsadlFlatAction,
} from "./types";

// Parse a USE CASE subtree into structured format
function parseUseCaseSubtree(
  subtree: Record<string, any>,
): OsadlConditionBlock {
  const then: OsadlActionNode[] = [];
  const either: OsadlEitherGroup[] = [];
  const children: OsadlConditionBlock[] = [];
  const except: OsadlConditionBlock[] = [];

  for (const [key, value] of Object.entries(subtree)) {
    if (key === "YOU MUST") {
      const actions = parseActions(value);
      then.push(...actions);
    } else if (key === "YOU MUST NOT") {
      const actions = parseActions(value, true);
      then.push(...actions);
    } else if (key === "IF") {
      const parsed = parseConditionMap(value);
      children.push(...parsed);
    } else if (key === "EXCEPT IF") {
      const parsed = parseConditionMap(value);
      except.push(...parsed);
    } else if (key === "EITHER") {
      const eitherGroup = parseEither(value);
      either.push(eitherGroup);
    } else if (key === "EITHER IF") {
      const parsed = parseEitherIf(value);
      children.push(...parsed);
    }
  }

  const condition: OsadlConditionBlock = {
    condition: "root",
    ...(then.length > 0 ? { then } : {}),
    ...(either.length > 0 ? { either } : {}),
    ...(children.length > 0 ? { children } : {}),
    ...(except.length > 0 ? { except } : {}),
  };

  return condition;
}

// Parse a map of conditions (used by IF, EXCEPT IF)
function parseConditionMap(map: Record<string, any>): OsadlConditionBlock[] {
  const blocks: OsadlConditionBlock[] = [];

  for (const [conditionName, subtree] of Object.entries(map)) {
    if (typeof subtree === "object" && subtree !== null) {
      const block = parseUseCaseSubtree(subtree);
      block.condition = conditionName;
      blocks.push(block);
    }
  }

  return blocks;
}

// Parse EITHER structure
function parseEither(eitherObj: Record<string, any>): OsadlEitherGroup {
  const group: OsadlEitherGroup = {
    options: [],
    common: [],
  };

  // Either structure: { "1": { OR: {...}, YOU MUST: {...} } }
  for (const [key, value] of Object.entries(eitherObj)) {
    if (typeof value === "object" && value !== null) {
      // Check for OR branch
      if (value.OR) {
        const options = parseOrBranch(value.OR);
        group.options.push(...options);
      }

      // Check for common actions (actions outside OR but inside EITHER)
      if (value["YOU MUST"]) {
        const commonActions = parseActions(value["YOU MUST"]);
        group.common!.push(...commonActions);
      }
      if (value["YOU MUST NOT"]) {
        const commonActions = parseActions(value["YOU MUST NOT"], true);
        group.common!.push(...commonActions);
      }
    }
  }

  if (group.common!.length === 0) delete group.common;

  return group;
}

// Parse OR branch
function parseOrBranch(orObj: Record<string, any>): OsadlActionNode[][] {
  const options: OsadlActionNode[][] = [];

  for (const [key, value] of Object.entries(orObj)) {
    if (typeof value === "object" && value !== null) {
      const optionActions = parseUseCaseSubtree(value);
      // Collect all actions from this option
      const allActions: OsadlActionNode[] = [
        ...(optionActions.then || []),
      ];

      // If this option has nested either, flatten it (simplified)
      if (optionActions.either && optionActions.either.length > 0) {
        for (const eg of optionActions.either) {
          for (const opt of eg.options) {
            allActions.push(...opt);
          }
        }
      }

      if (allActions.length > 0) {
        options.push(allActions);
      }
    }
  }

  return options;
}

// Parse EITHER IF structure (conditional choice)
function parseEitherIf(eitherIfObj: Record<string, any>): OsadlConditionBlock[] {
  const blocks: OsadlConditionBlock[] = [];

  for (const [key, value] of Object.entries(eitherIfObj)) {
    if (typeof value === "object" && value !== null) {
      // Each key in EITHER IF contains conditions
      for (const [conditionName, subtree] of Object.entries(value)) {
        if (typeof subtree === "object" && subtree !== null) {
          const block = parseUseCaseSubtree(subtree);
          block.condition = conditionName;
          blocks.push(block);
        }
      }
    }
  }

  return blocks;
}

// Parse action map (YOU MUST / YOU MUST NOT value)
function parseActions(
  actionsObj: Record<string, any> | string,
  isProhibition = false,
): OsadlActionNode[] {
  const actions: OsadlActionNode[] = [];

  if (typeof actionsObj === "string") {
    // Single action as string
    actions.push({ text: actionsObj, type: isProhibition ? 'must-not' : 'must' });
    return actions;
  }

  if (typeof actionsObj !== "object" || actionsObj === null) {
    return actions;
  }

  for (const [actionText, actionValue] of Object.entries(actionsObj)) {
    if (actionText === "ATTRIBUTE") {
      // Skip ATTRIBUTE at this level (handled in parseActionAttributes)
      continue;
    }

    const action: OsadlActionNode = {
      text: actionText,
      type: isProhibition ? 'must-not' : 'must',
      attributes: [],
    };

    // Parse attributes if present
    if (typeof actionValue === "object" && actionValue !== null) {
      if (actionValue.ATTRIBUTE) {
        action.attributes = parseActionAttributes(actionValue.ATTRIBUTE);
      }

      // Handle nested IF inside action (rare case)
      if (actionValue.IF) {
        // For now, ignore nested IF in actions
      }
    }

    // Only add attributes if they exist
    if (action.attributes && action.attributes.length === 0) {
      delete action.attributes;
    }

    actions.push(action);
  }

  return actions;
}

// Parse ATTRIBUTE value (can be object, string, or array)
function parseActionAttributes(
  attrValue: Record<string, any> | string | any[],
): string[] {
  const attributes: string[] = [];

  if (typeof attrValue === "string") {
    attributes.push(attrValue);
    return attributes;
  }

  if (Array.isArray(attrValue)) {
    return attrValue.filter((v): v is string => typeof v === "string");
  }

  if (typeof attrValue === "object" && attrValue !== null) {
    for (const [attrName, attrSubValue] of Object.entries(attrValue)) {
      if (typeof attrSubValue === "object" && attrSubValue !== null) {
        // Nested ATTRIBUTE or complex structure - flatten to string
        attributes.push(attrName);
      } else {
        attributes.push(attrName);
      }
    }
  }

  return attributes;
}

// Main parser: convert raw checklist to structured trees
export function parseChecklist(
  checklist: Record<string, any>,
): OsadlUseCaseTree[] {
  const trees: OsadlUseCaseTree[] = [];
  const useCaseObj = checklist["USE CASE"];

  if (!useCaseObj || typeof useCaseObj !== "object") {
    return trees;
  }

  for (const [useCaseName, useCaseSubtree] of Object.entries(useCaseObj)) {
    if (typeof useCaseSubtree === "object" && useCaseSubtree !== null) {
      const root = parseUseCaseSubtree(useCaseSubtree);
      root.condition = "root";
      trees.push({
        use_case: useCaseName,
        root,
      });
    }
  }

  return trees;
}

// Flatten a condition block into a list of flat actions
export function flattenConditionBlock(
  block: OsadlConditionBlock,
  conditionPath: string[] = [],
  useCase: string = "",
  eitherGroupIndex?: number,
  isCommon: boolean = false,
): OsadlFlatAction[] {
  const flat: OsadlFlatAction[] = [];
  const currentPath = [...conditionPath, block.condition].filter(
    (c) => c !== "root",
  );

  // Direct actions (AND)
  if (block.then) {
    for (const action of block.then) {
      flat.push({
        text: action.text,
        type: action.type,
        attributes: action.attributes,
        condition_path: currentPath,
        use_case: useCase,
        either_group: eitherGroupIndex,
        is_common: isCommon,
      });
    }
  }

  // Either groups
  if (block.either) {
    block.either.forEach((eg, egIdx) => {
      // Common actions in either group
      if (eg.common) {
        for (const action of eg.common) {
          flat.push({
            text: action.text,
            type: action.type,
            attributes: action.attributes,
            condition_path: currentPath,
            use_case: useCase,
            either_group: egIdx,
            is_common: true,
          });
        }
      }

      // Options (simplified: take first option for display)
      eg.options.forEach((option, optIdx) => {
        for (const action of option) {
          flat.push({
            text: action.text,
            type: action.type,
            attributes: action.attributes,
            condition_path: currentPath,
            use_case: useCase,
            either_group: egIdx,
            is_common: false,
          });
        }
      });
    });
  }

  // Child conditions
  if (block.children) {
    for (const child of block.children) {
      flat.push(
        ...flattenConditionBlock(child, currentPath, useCase, eitherGroupIndex, isCommon),
      );
    }
  }

  // Except conditions
  if (block.except) {
    for (const except of block.except) {
      flat.push(
        ...flattenConditionBlock(
          except,
          [...currentPath, "unless"],
          useCase,
          eitherGroupIndex,
          isCommon,
        ),
      );
    }
  }

  return flat;
}

// Flatten all trees into a list of actions
export function flattenTrees(trees: OsadlUseCaseTree[]): OsadlFlatAction[] {
  const flat: OsadlFlatAction[] = [];

  for (const tree of trees) {
    flat.push(
      ...flattenConditionBlock(tree.root, [], tree.use_case),
    );
  }

  return flat;
}
