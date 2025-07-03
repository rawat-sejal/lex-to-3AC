// parser.js

let current = 0;  // Global index for iterating through tokens

function isTypeSpecifier(token) {
  const types = ['int', 'char', 'float', 'double', 'void'];
  return token.type === 'KEYWORD' && types.includes(token.value);
}

function parse(tokens) {
  return parseProgram(tokens);
}

function parseProgram(tokens) {
  let body = [];
  current = 0;
  while (current < tokens.length) {
    let token = tokens[current];
    if (token.type === 'COMMENT') {
      current++;
      continue;
    }
    if (token.type === 'PREPROCESSOR') {
      body.push({ type: 'PreprocessorDirective', value: token.value.trim() });
      current++;
    } else if (isTypeSpecifier(token)) {
      let funcNode = parseFunctionDefinition(tokens);
      if (funcNode) body.push(funcNode);
    } else {
      current++;
    }
  }
  return { type: 'Program', body };
}

function parseFunctionDefinition(tokens) {
  let returnType = tokens[current].value;
  current++;
  let funcName = tokens[current].value;
  current++;

  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') {
    return { error: "Expected '(' after function name" };
  }
  current++;

  let parameters = [];
  while (tokens[current] && tokens[current].value.trim() !== ')') {
    if (tokens[current].value.trim() === ',') {
      current++;
      continue;
    }
    if (isTypeSpecifier(tokens[current])) {
      let paramType = tokens[current].value;
      current++;
      let paramName = tokens[current] ? tokens[current].value : "<missing id>";
      current++;
      parameters.push({ type: 'Parameter', paramType, paramName });
    } else {
      current++;
    }
  }
  current++;

  if (!tokens[current] || tokens[current].type !== 'OPEN_BRACE') {
    return { error: "Expected '{' at beginning of function body" };
  }
  let bodyNode = parseCompoundStatement(tokens);
  return {
    type: 'FunctionDeclaration',
    returnType,
    name: funcName,
    parameters,
    body: bodyNode
  };
}

function parseCompoundStatement(tokens) {
  if (tokens[current].type !== 'OPEN_BRACE') {
    return { error: "Expected '{' at beginning of compound statement" };
  }
  let compound = { type: 'CompoundStatement', body: [] };
  current++;
  while (current < tokens.length && tokens[current].type !== 'CLOSE_BRACE') {
    let stmt = parseStatement(tokens);
    if (stmt) compound.body.push(stmt);
  }
  if (tokens[current] && tokens[current].type === 'CLOSE_BRACE') {
    current++;
  } else {
    return { error: "Expected '}' at end of compound statement" };
  }
  return compound;
}

function parseStatement(tokens) {
  let token = tokens[current];
  if (!token) return null;

  if (token.type === 'COMMENT') {
    current++;
    return null;
  }

  if (token.type === 'KEYWORD') {
    switch (token.value) {
      case 'return': return parseReturnStatement(tokens);
      case 'if': return parseIfStatement(tokens);
      case 'for': return parseForStatement(tokens);
      case 'while': return parseWhileStatement(tokens);
      case 'do': return parseDoWhileStatement(tokens);
      case 'break': return parseBreakStatement(tokens);
      case 'continue': return parseContinueStatement(tokens);
      case 'switch': return parseSwitchStatement(tokens);
    }
  }

  if (isTypeSpecifier(token)) return parseDeclaration(tokens, true);
  if (token.type === 'OPEN_BRACE') return parseCompoundStatement(tokens);

  return parseExpressionStatement(tokens);
}

function parseReturnStatement(tokens) {
  current++;
  const expr = parseExpression(tokens);
  if (tokens[current] && tokens[current].value === ';') current++;
  return { type: 'ReturnStatement', expression: expr };
}

function parseBreakStatement(tokens) {
  current++;
  if (tokens[current] && tokens[current].value === ';') current++;
  return { type: 'BreakStatement' };
}

function parseContinueStatement(tokens) {
  current++;
  if (tokens[current] && tokens[current].value === ';') current++;
  return { type: 'ContinueStatement' };
}

function parseIfStatement(tokens) {
  current++;
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') return { error: "Expected '(' after if" };
  current++;
  const condition = parseExpression(tokens);
  if (!tokens[current] || tokens[current].type !== 'CLOSE_PAREN') return { error: "Expected ')' after condition" };
  current++;
  const thenStmt = parseStatement(tokens);
  let elseStmt = null;
  if (tokens[current] && tokens[current].value === 'else') {
    current++;
    elseStmt = parseStatement(tokens);
  }
  return { type: 'IfStatement', condition, then: thenStmt, else: elseStmt };
}

function parseWhileStatement(tokens) {
  current++;
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') return { error: "Expected '(' after while" };
  current++;
  const condition = parseExpression(tokens);
  if (!tokens[current] || tokens[current].type !== 'CLOSE_PAREN') return { error: "Expected ')' after condition" };
  current++;
  const body = parseStatement(tokens);
  return { type: 'WhileStatement', condition, body };
}

function parseDoWhileStatement(tokens) {
  current++;
  const body = parseStatement(tokens);
  if (!tokens[current] || tokens[current].value !== 'while') return { error: "Expected 'while' after do" };
  current++;
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') return { error: "Expected '(' after while" };
  current++;
  const condition = parseExpression(tokens);
  if (!tokens[current] || tokens[current].type !== 'CLOSE_PAREN') return { error: "Expected ')' after condition" };
  current++;
  if (tokens[current] && tokens[current].value === ';') current++;
  return { type: 'DoWhileStatement', condition, body };
}

function parseForStatement(tokens) {
  current++;
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') return { error: "Expected '(' after for" };
  current++;

  let initialization = isTypeSpecifier(tokens[current])
    ? parseDeclaration(tokens, false)
    : parseExpression(tokens);
  if (tokens[current] && tokens[current].value === ';') current++;

  let condition = parseExpression(tokens);
  if (tokens[current] && tokens[current].value === ';') current++;

  let increment = parseExpression(tokens);
  if (tokens[current] && tokens[current].type === 'CLOSE_PAREN') current++;

  let body = parseStatement(tokens);
  return { type: 'ForStatement', initialization, condition, increment, body };
}

function parseSwitchStatement(tokens) {
  current++;
  if (!tokens[current] || tokens[current].type !== 'OPEN_PAREN') return { error: "Expected '(' after switch" };
  current++;
  const expression = parseExpression(tokens);
  if (!tokens[current] || tokens[current].type !== 'CLOSE_PAREN') return { error: "Expected ')'" };
  current++;

  if (!tokens[current] || tokens[current].type !== 'OPEN_BRACE') return { error: "Expected '{' after switch" };
  current++;

  let cases = [];
  let defaultCase = null;

  while (tokens[current] && tokens[current].type !== 'CLOSE_BRACE') {
    if (tokens[current].value === 'case') {
      current++;
      const value = parseExpression(tokens);
      if (tokens[current] && tokens[current].value === ':') current++;
      const body = [];
      while (tokens[current] && tokens[current].value !== 'case' && tokens[current].value !== 'default' && tokens[current].type !== 'CLOSE_BRACE') {
        body.push(parseStatement(tokens));
      }
      cases.push({ type: 'CaseClause', value, body });
    } else if (tokens[current].value === 'default') {
      current++;
      if (tokens[current] && tokens[current].value === ':') current++;
      const body = [];
      while (tokens[current] && tokens[current].value !== 'case' && tokens[current].type !== 'CLOSE_BRACE') {
        body.push(parseStatement(tokens));
      }
      defaultCase = { type: 'DefaultClause', body };
    } else {
      current++;
    }
  }
  if (tokens[current] && tokens[current].type === 'CLOSE_BRACE') current++;

  return { type: 'SwitchStatement', expression, cases, defaultCase };
}

function parseDeclaration(tokens, expectSemicolon) {
  let varType = tokens[current].value;
  current++;
  const variables = [];
  while (true) {
    if (!tokens[current] || tokens[current].type !== 'IDENTIFIER') break;
    let varName = tokens[current].value;
    current++;
    let initializer = null;
    if (tokens[current] && tokens[current].value === '=') {
      current++;
      initializer = parseExpression(tokens);
    }
    variables.push({ type: 'VariableDeclarator', name: varName, initializer });
    if (!tokens[current] || tokens[current].value !== ',') break;
    current++;
  }
  if (expectSemicolon && tokens[current] && tokens[current].value === ';') current++;
  return { type: 'DeclarationStatement', varType, variables };
}

function parseExpressionStatement(tokens) {
  const expr = parseExpression(tokens);
  if (tokens[current] && tokens[current].value === ';') current++;
  return { type: 'ExpressionStatement', expression: expr };
}

function parseExpression(tokens) {
  return parseAssignment(tokens);
}

function parseAssignment(tokens) {
  let left = parseEquality(tokens);
  if (tokens[current] && tokens[current].value === '=') {
    current++;
    let right = parseAssignment(tokens);
    return { type: 'AssignmentExpression', operator: '=', left, right };
  }
  return left;
}

function parseEquality(tokens) {
  let left = parseRelational(tokens);
  while (tokens[current] && ['==', '!='].includes(tokens[current].value)) {
    let op = tokens[current].value;
    current++;
    let right = parseRelational(tokens);
    left = { type: 'BinaryExpression', operator: op, left, right };
  }
  return left;
}

function parseRelational(tokens) {
  let left = parseAdditive(tokens);
  while (tokens[current] && ['<', '>', '<=', '>='].includes(tokens[current].value)) {
    let op = tokens[current].value;
    current++;
    let right = parseAdditive(tokens);
    left = { type: 'BinaryExpression', operator: op, left, right };
  }
  return left;
}

function parseAdditive(tokens) {
  let left = parseMultiplicative(tokens);
  while (tokens[current] && ['+', '-'].includes(tokens[current].value)) {
    let op = tokens[current].value;
    current++;
    let right = parseMultiplicative(tokens);
    left = { type: 'BinaryExpression', operator: op, left, right };
  }
  return left;
}

function parseMultiplicative(tokens) {
  let left = parseUnary(tokens);
  while (tokens[current] && ['*', '/', '%'].includes(tokens[current].value)) {
    let op = tokens[current].value;
    current++;
    let right = parseUnary(tokens);
    left = { type: 'BinaryExpression', operator: op, left, right };
  }
  return left;
}

function parseUnary(tokens) {
  if (tokens[current] && ['++', '--'].includes(tokens[current].value)) {
    let op = tokens[current].value;
    current++;
    let argument = parseUnary(tokens);
    return { type: 'PrefixExpression', operator: op, argument };
  }
  return parsePostfix(tokens);
}

function parsePostfix(tokens) {
  let node = parsePrimary(tokens);
  while (tokens[current] && ['++', '--'].includes(tokens[current].value)) {
    let op = tokens[current].value;
    current++;
    node = { type: 'PostfixExpression', operator: op, argument: node };
  }
  return node;
}

function parsePrimary(tokens) {
  let token = tokens[current];
  if (!token) return null;

  if (token.type === 'NUMBER' || token.type === 'STRING_LITERAL') {
    current++;
    return { type: 'Literal', value: token.value };
  }
  if (token.type === 'IDENTIFIER') {
    current++;
    let node = { type: 'Identifier', name: token.value };
    if (tokens[current] && tokens[current].type === 'OPEN_PAREN') {
      current++;
      let args = [];
      while (tokens[current] && tokens[current].type !== 'CLOSE_PAREN') {
        args.push(parseExpression(tokens));
        if (tokens[current] && tokens[current].value === ',') current++;
      }
      if (tokens[current] && tokens[current].type === 'CLOSE_PAREN') current++;
      return { type: 'FunctionCall', name: node.name, arguments: args };
    }
    return node;
  }
  if (token.type === 'OPEN_PAREN') {
    current++;
    let expr = parseExpression(tokens);
    if (tokens[current] && tokens[current].type === 'CLOSE_PAREN') current++;
    return expr;
  }

  current++;
  return { type: 'Unknown', value: token.value };
}
