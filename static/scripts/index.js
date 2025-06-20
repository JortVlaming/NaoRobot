// Initialize Blockly workspace
let workspace;

window.addEventListener('DOMContentLoaded', () => {
	workspace = Blockly.inject('blocklyDiv', {
		toolbox: document.getElementById('toolbox'),
		theme: Blockly.Themes.Dark
	});

	// Define all blocks
	defineAllBlocks();
});

// Reusable block + generator function
function defineBlock({ name, args = [], display = null, color = 230 }) {
	Blockly.Blocks[name] = {
		init: function () {
			let displayName = display ?? name.replace(/_/g, ' ').toUpperCase();
			const usedArgNames = new Set();
			const parts = displayName.split(/({{[^}]+}})/g);

			let currentInput = this.appendDummyInput(); // Holds label + dropdowns
			this.setInputsInline(true); // Force inline layout

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				const match = part.match(/{{(.+?)}}/);

				if (match) {
					const argName = match[1];
					const argDef = args.find(a => a.name === argName);

					if (!argDef) {
						console.warn(`Argument '{{${argName}}}' not found in args for block '${name}'`);
						continue;
					}
					usedArgNames.add(argName);

					if (argDef.type === 'dropdown' && argDef.options) {
						// Inline dropdown
						currentInput.appendField(new Blockly.FieldDropdown(argDef.options), argName);
					} else {
						// Flush current dummy input if it's not empty
						if (currentInput.fieldRow.length > 0) {
							currentInput = this.appendDummyInput();
						}
						this.appendValueInput(argName)
							.setCheck(argDef.type || null);
						// Start new dummy input line for potential remaining fields
						currentInput = this.appendDummyInput();
					}
				} else if (part.trim() !== '') {
					currentInput.appendField(part);
				}
			}

			// Add unused args as separate block inputs
			// this.appendDummyInput().appendField(displayName);
			this.appendEndRowInput();
			for (const arg of args) {
				if (!usedArgNames.has(arg.name)) {
					if (arg.type === 'dropdown' && arg.options) {
						this.appendDummyInput()
							.appendField(arg.label || arg.name)
							.appendField(new Blockly.FieldDropdown(arg.options), arg.name);
						this.appendEndRowInput();
					} else {
						this.appendValueInput(arg.name)
							.setCheck(arg.type || null)
							.appendField(arg.label || arg.name)
							.setAlign(0);
						this.appendEndRowInput();
					}
				}
			}


			// for (const arg of args) {
			// 	this.appendValueInput(arg.name)
			// 		.setCheck(arg.type || null)
			// 		.appendField(arg.label || arg.name);
			// }

			if (name !== 'start_program') {
				this.setPreviousStatement(true);
			}
			this.setNextStatement(true);
			this.setColour(color);
			this.setTooltip('');
			this.setHelpUrl('');
		}
	};
}


// Define your custom blocks here
function defineAllBlocks() {
	// Programma category
	defineBlock({
		name: 'start_program',
		args: [],
		color: 120, // green
	});
	
	// Spraak category
	defineBlock({
		name: 'say_something',
		display: "Zeg {{text}}",
		args: [
			{ name: 'text', label: 'Tekst', type: 'String' },
		]
	});

	defineBlock({
		name: "test",
		display: "Test {{TEST1}} test",
		args: [
			{ name: 'TEST1', label: 'test', type: 'String' },
			{ name: 'TEST3', label: 'test', type: 'String' },
			{ name: 'TEST2', label: 'test', type: 'dropdown', options: [["test1", "test"], ["test2", "test"]]}
		]
	})

	defineBlock({
		name: 'set_language',
		display: 'Zet spraak taal naar {{LANGUAGE}}',
		args: [
			{
				name: 'LANGUAGE',
				type: 'dropdown',
				options: [
					["Nederlands", "Dutch"],
					["Engels", "English"],
					["Frans", "French"],
					["Japans", "Japanese"],
					["Chinees", "Chinese"],
					["Spaans", "Spanish"],
					["Duits", "German"],
					["Koreaans", "Korean"],
					["Italiaans", "Italian"],
					["Fins", "Finnish"],
					["Pools", "Polish"],
					["Russisch", "Russian"],
					["Turks", "Turkish"],
					["Arabisch", "Arabic"],
					["Tsjechisch", "Czech"],
					["Portugees", "Portuguese"],
					["Braziliaans", "Brazilian"],
					["Zweeds", "Swedish"],
					["Deens", "Danish"],
					["Noors", "Norwegian"],
					["Grieks", "Greek"]
				]
			}
		]
	});


	defineBlock({
		name: 'set_led',
		display: 'set LED to {{COLOR}}',
		color: 160,
		args: [
			{
				name: 'COLOR',
				type: 'dropdown',
				options: [
					["Red", "red"],
					["Green", "green"],
					["Blue", "blue"],
					["Off", "off"]
				]
			}
		]
	});
}

// Extract structured block commands
function extractCommands(workspace) {
	const startBlock = workspace.getTopBlocks(true).find(b => b.type === 'start_program');
	if (!startBlock) {
		alert("Missing 'start_program' block.");
		return [];
	}

	const commands = [];
	let current = startBlock.getNextBlock();

	while (current) {
		const args = [];

		// Check for field values like dropdowns
		const fieldNames = current.inputList
			.flatMap(input => input.fieldRow)
			.map(field => field.name)
			.filter(name => !!name); // remove undefined

		for (const name of fieldNames) {
			args.push(current.getFieldValue(name));
		}

		// Still check connected blocks
		for (const input of current.inputList) {
			const target = input.connection?.targetBlock();
			if (target) {
				args.push(extractValueFromBlock(target));
			}
		}

		commands.push({ type: current.type, args });
		current = current.getNextBlock();
	}

	return commands;
}

function extractValueFromBlock(block) {
  // Handle value blocks like math_number, text, boolean, and create_list
  console.log(block);
  console.log(block.type);
  switch (block.type) {
    case 'math_number':
      return Number(block.getFieldValue('NUM'));

    case 'text':
      return block.getFieldValue('TEXT');

    case 'logic_boolean':
      return block.getFieldValue('BOOL') === 'TRUE';

    case 'create_list': {
      const items = [];
      for (let i = 0; block.getInput('ITEM' + i); i++) {
        const child = block.getInputTargetBlock('ITEM' + i);
        items.push(child ? extractValueFromBlock(child) : null);
      }
      return items;
    }

    default:
      // Default fallback: get all field values (dropdowns, checkboxes, etc.)
      const fieldValues = {};
      for (const input of block.inputList) {
        for (const field of input.fieldRow) {
          fieldValues[field.name] = block.getFieldValue(field.name);
        }
      }
      // If only one field, return its value directly; otherwise return an object
      const keys = Object.keys(fieldValues);
      if (keys.length === 1) return fieldValues[keys[0]];
      return fieldValues;
  }
}

// Clean string/number from Blockly code output
function cleanValue(code) {
	if (typeof code === 'string') {
		return code.replace(/^["']|["']$/g, '');
	}
	return code;
}

// Run the Blockly program
function runCode() {
	const commands = extractCommands(workspace);

	console.log(commands);

	fetch(location + 'api/blocks', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ commands })
	})
		.then(res => res.json())
		.then(data => {
			console.log('Server response:', data);
			alert('Response:\n' + JSON.stringify(data.results, null, 2));
		})
		.catch(console.error);
}

Blockly.Themes.Dark = Blockly.Theme.defineTheme('dark', {

  name: 'dark',

  base: Blockly.Themes.Classic,

  componentStyles: {

    workspaceBackgroundColour: '#1e1e1e',

    toolboxBackgroundColour: '#333',

    toolboxForegroundColour: '#fff',

    flyoutBackgroundColour: '#252526',

    flyoutForegroundColour: '#ccc',

    flyoutOpacity: 1,

    scrollbarColour: '#797979',

    insertionMarkerColour: '#fff',

    insertionMarkerOpacity: 0.3,

    scrollbarOpacity: 0.4,

    cursorColour: '#d0d0d0',

  },

});
