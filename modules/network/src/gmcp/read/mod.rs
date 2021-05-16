#![allow(unused_variables)]
#![allow(dead_code)]
use std::io;
use std::thread;
use std::sync::mpsc;
use std::sync::mpsc::Receiver;
use serde_json::Result;
use regex::Regex;

use crate::gmcp;

pub trait EventLoopArgs {
	fn get_command(&self) -> gmcp::Command;
	fn set_command(&self, new_command: gmcp::Command);
	fn should_exit(&self) -> bool;
	fn set_is_ready_to_exit(&self, is_ready_to_exit: bool);
	fn get_poll_interval_ms(&self) -> u64;
}

pub fn spawn_stdin_channel() -> Receiver<String> {
	let (tx, rx) = mpsc::channel::<String>();
	thread::spawn(move || loop {
		let mut buffer = String::new();
		io::stdin().read_line(&mut buffer).unwrap();
		tx.send(buffer).unwrap();
	});
	rx
}

fn parse_and_return_command_messages(data: &str) -> InputContainer {
	let mut commands: Vec<gmcp::Command> = Vec::new();
	let mut errors: Vec<String> = Vec::new();

	// TODO: Figure out how to move reg ex creation out of this function for performance reasons.
	// Or lazy load a static global variable so it only happens once
	let command_message_re: String = format!(r#"{}\s*(\{{\s*["']type["']\s*:\s*["']command["'].*\}})\s*{}"#, 
		gmcp::MESSAGE_TAG_OPEN, gmcp::MESSAGE_TAG_CLOSE);
	let re = Regex::new(&command_message_re).unwrap();

	for cap in re.captures_iter(data) {
		if cap.len() != 2 { continue; }

		// Deserialize message
		match serde_json::from_str(&cap[1]) as Result<gmcp::Message> {
			Ok(message) => {
				// Deserialize command
				match serde_json::from_str(&message.data) as Result<gmcp::Command> {
					Ok(c) => commands.push(c),
					Err(e) => errors.push(format!("Unable to parse Command from input json. Error: {}, Data {}", 
								e, message.data))
				}
			},
			Err(e) => errors.push(format!("Unable to parse Message from input json. Error: {}, Data {}", e, &cap[1]))
		};
	}

	InputContainer {
		commands: commands,
		errors: errors
	}
}

// Only commands are used as module input right now
pub struct InputContainer {
	pub commands: Vec<gmcp::Command>,
	pub errors: Vec<String>,
}
impl InputContainer {
	pub fn new(input_data: &str) -> InputContainer {
		parse_and_return_command_messages(input_data)
	}
}

#[cfg(test)]
mod tests {
    use crate::gmcp;
	use super::*;

    #[test]
    fn deserialize_command_from_gmcp_message() {
		let command = gmcp::Command {
			command_type: String::from(gmcp::CommandType::THROTTLE),
			data: String::from("20")
		};

		let json = r#"<<GMCP>>{"type": "command", "data": "{\"type\": \"throttle\", \"data\": \"20\"}"}<</GMCP>>"#;
		let input_container = InputContainer::new(json);

        assert_eq!(input_container.errors.len(), 0, "errors found");
        assert_eq!(input_container.commands.len(), 1, "no commands found");
        assert_eq!(command.command_type, input_container.commands[0].command_type, "command types differ");
        assert_eq!(command.data, input_container.commands[0].data, "command data differs");
    }
}