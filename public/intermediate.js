// Three Address Code Generator
let tempCounter = 0;
let labelCounter = 0;

function generateTemp() {
    return 't' + (tempCounter++);
}

function generateLabel() {
    return 'L' + (labelCounter++);
}

function formatInstruction(instruction) {
    if (instruction.includes(':')) {
        return instruction;
    }
    return '    ' + instruction;
}

function generateTAC(ast) {
    tempCounter = 0;
    labelCounter = 0;
    const code = [];

    function processNode(node) {
        if (!node) return { code: [], place: null };

        switch (node.type) {
            case 'Program':
                return processProgram(node);
            case 'FunctionDeclaration':
                return processFunctionDeclaration(node);
            case 'CompoundStatement':
                return processCompoundStatement(node);
            case 'BinaryExpression':
                return processBinaryExpression(node);
            case 'Literal':
                return { code: [], place: node.value };
            case 'Identifier':
                return { code: [], place: node.name };
            case 'AssignmentExpression':
                return processAssignment(node);
            case 'DeclarationStatement':
                return processDeclaration(node);
            case 'IfStatement':
                return processIfStatement(node);
            case 'ForStatement':
                return processForStatement(node);
            case 'WhileStatement':
                return processWhileStatement(node);
            case 'DoWhileStatement':
                return processDoWhileStatement(node);
            case 'BreakStatement':
                return { code: ['break'] };
            case 'ContinueStatement':
                return { code: ['continue'] };
            case 'SwitchStatement':
                return processSwitchStatement(node);
            case 'ReturnStatement':
                return processReturnStatement(node);
            case 'Parameter':
                return processParameter(node);
            default:
                console.log("Unhandled node type:", node.type);
                return { code: [], place: null };
        }
    }

    function processProgram(node) {
        let allCode = [];
        node.body.forEach(statement => {
            const { code } = processNode(statement);
            allCode = [...allCode, ...code.map(formatInstruction)];
        });
        return { code: allCode };
    }

    function processFunctionDeclaration(node) {
        let functionCode = [`\nFUNCTION ${node.name}:`];
        node.parameters.forEach(param => {
            const { code } = processNode(param);
            functionCode.push(...code.map(formatInstruction));
        });
        const { code } = processNode(node.body);
        functionCode.push(...code.map(formatInstruction));
        functionCode.push('END_FUNCTION\n');
        return { code: functionCode };
    }

    function processCompoundStatement(node) {
        let blockCode = [];
        node.body.forEach(statement => {
            const { code } = processNode(statement);
            blockCode.push(...code);
        });
        return { code: blockCode };
    }

    function processBinaryExpression(node) {
        const left = processNode(node.left);
        const right = processNode(node.right);
        const temp = generateTemp();
        return {
            code: [
                ...left.code,
                ...right.code,
                `${temp} = ${left.place} ${node.operator} ${right.place}`
            ],
            place: temp
        };
    }

    function processAssignment(node) {
        const right = processNode(node.right);
        const left = processNode(node.left);
        return {
            code: [
                ...right.code,
                `${left.place} = ${right.place}`
            ]
        };
    }

    function processDeclaration(node) {
        const declCode = [];
        for (const v of node.variables) {
            if (v.initializer) {
                const init = processNode(v.initializer);
                declCode.push(...init.code, `${v.name} = ${init.place}`);
            } else {
                declCode.push(`DECLARE ${v.name}`);
            }
        }
        return { code: declCode };
    }

    function processIfStatement(node) {
        const condition = processNode(node.condition);
        const thenCode = processNode(node.then);
        const elseCode = node.else ? processNode(node.else) : { code: [] };

        const labelTrue = generateLabel();
        const labelEnd = generateLabel();

        return {
            code: [
                ...condition.code,
                `if ${condition.place} goto ${labelTrue}`,
                ...elseCode.code,
                `goto ${labelEnd}`,
                `${labelTrue}:`,
                ...thenCode.code,
                `${labelEnd}:`
            ]
        };
    }

    function processForStatement(node) {
        const initCode = processNode(node.initialization);
        const condCode = processNode(node.condition);
        const incrCode = processNode(node.increment);
        const bodyCode = processNode(node.body);

        const labelStart = generateLabel();
        const labelCheck = generateLabel();
        const labelEnd = generateLabel();

        return {
            code: [
                ...initCode.code,
                `${labelCheck}:`,
                ...condCode.code,
                `ifFalse ${condCode.place} goto ${labelEnd}`,
                `${labelStart}:`,
                ...bodyCode.code,
                ...incrCode.code,
                `goto ${labelCheck}`,
                `${labelEnd}:`
            ]
        };
    }

    function processWhileStatement(node) {
        const labelStart = generateLabel();
        const labelEnd = generateLabel();
        const condition = processNode(node.condition);
        const body = processNode(node.body);

        return {
            code: [
                `${labelStart}:`,
                ...condition.code,
                `ifFalse ${condition.place} goto ${labelEnd}`,
                ...body.code,
                `goto ${labelStart}`,
                `${labelEnd}:`
            ]
        };
    }

    function processDoWhileStatement(node) {
        const labelStart = generateLabel();
        const condition = processNode(node.condition);
        const body = processNode(node.body);

        return {
            code: [
                `${labelStart}:`,
                ...body.code,
                ...condition.code,
                `if ${condition.place} goto ${labelStart}`
            ]
        };
    }

    function processSwitchStatement(node) {
        const condition = processNode(node.expression);
        const endLabel = generateLabel();
        let caseCode = [];
        let labels = {};

        node.cases.forEach(caseNode => {
            let label = generateLabel();
            labels[caseNode.value] = label;
        });

        node.cases.forEach(caseNode => {
            caseCode.push(`${labels[caseNode.value]}:`);
            caseCode.push(...caseNode.body.map(s => processNode(s)).flatMap(n => n.code));
        });

        const switchCode = [];
        node.cases.forEach(caseNode => {
            const testVal = caseNode.value;
            const cmpTemp = generateTemp();
            switchCode.push(`${cmpTemp} = ${condition.place} == ${testVal}`);
            switchCode.push(`if ${cmpTemp} goto ${labels[testVal]}`);
        });

        if (node.defaultBody.length > 0) {
            const defaultLabel = generateLabel();
            switchCode.push(`goto ${defaultLabel}`);
            caseCode.push(`${defaultLabel}:`);
            caseCode.push(...node.defaultBody.map(s => processNode(s)).flatMap(n => n.code));
        }

        caseCode.push(`${endLabel}:`);

        return {
            code: [...condition.code, ...switchCode, ...caseCode]
        };
    }

    function processReturnStatement(node) {
        const expr = processNode(node.expression);
        return {
            code: [...expr.code, `return ${expr.place}`]
        };
    }

    function processParameter(node) {
        return {
            code: [`PARAM ${node.paramName} : ${node.paramType}`],
            place: node.paramName
        };
    }

    const result = processNode(ast);
    return result.code;
}
