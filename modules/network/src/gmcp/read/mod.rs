#![allow(unused_variables)]
#![allow(dead_code)]

use regex::Regex;
use crate::gmcp;

static COMMAND_MESSAGE_RE: String = format!(r#"{}\s*(\{{\s*["']type["']\s*:\s*["']command["'].*\}})\s*{}"#, 
	gmcp::MESSAGE_TAG_OPEN, gmcp::MESSAGE_TAG_CLOSE);

fn parse_and_return_command_messages(data: &str) -> InputContainer {
	let commands: Vec<gmcp::Command> = Vec::new();
	let errors: Vec<String> = Vec::new();


	let re = Regex::new(&COMMAND_MESSAGE_RE).unwrap();
	// use regex to pull out each command message text (ignore other message types)

	// Deserialize each command in the message (message.data) and add to commands vector

	// Any errors (like unable to deserialize a command) goes in errors vector

	InputContainer {
		commands: commands,
		errors: errors
	}
}

// Only commands are used as module input right now
pub struct InputContainer<'a> {
	pub commands: Vec<gmcp::Command<'a>>,
	pub errors: Vec<String>,
}
impl InputContainer<'_> {
	pub fn new(input_data: &str) -> InputContainer {
		parse_and_return_command_messages(input_data)
	}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serialize_command() {
		let command = Command {
			command_type: CommandType::THROTTLE,
			data: "20"
		};
        assert_eq!(command.to_json(), r#"{"type": "throttle", "data": "20"}"#);
    }
}