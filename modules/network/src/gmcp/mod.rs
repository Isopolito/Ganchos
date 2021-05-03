#![allow(unused_variables)]
#![allow(dead_code)]

// message
pub const MESSAGE_TAG_OPEN: &str = "<<GMCP>>";
pub const MESSAGE_TAG_CLOSE: &str = "<</GMCP>>";

pub struct MessageType;
impl MessageType {
	const EVENT: &'static str = "event";
	const LOG: &'static str = "log";
	const COMMAND: &'static str = "command";
}

pub struct Message<'a> {
	message_type: &'a str,
	payload: String, // json
}
impl Message<'_> {
	fn create_event_message(&self, event: &Event) -> Message {
		Message {
			message_type: MessageType::EVENT,
			payload: format!(r#"{{"messageType": "{}", "payload": {}"#,
				MessageType::EVENT, event.to_json())
		}
	}
}

// events
pub struct EventType;
impl EventType {
	const ADD_FILE: &'static str = "addFile";
	const ADD_DIR: &'static str = "addDir";
	const CHANGE_FILE: &'static str = "changeFile";
	const UNLINK_FILE: &'static str = "unlinkFile";
	const UNLINK_DIR: &'static str = "unlinkDir";
	const INET_UP: &'static str = "inetUp";
	const INET_DOWN: &'static str = "inetDown";
	const IP_CHANGE: &'static str = "ipChange";
	const PACKET_MATCH: &'static str = "packetMatch";
	const NONE: &'static str = "none";
}

pub struct EventData<'a> {
	data_type: &'a str,
	data: String,
}
impl EventData<'_> {
	fn to_json(&self) -> String {
		format!(r#"{{"dataType": "{}", "data": {}"#,
				self.data_type, self.data)
	}
}

pub struct Event<'a> {
	event_type: &'a str,
	event_data: EventData<'a>,
}
impl Event<'_> {
	fn to_json(&self) -> String {
		format!(r#"{{"eventType": "{}", "eventData": {}"#,
				&self.event_type, &self.event_data.to_json())
	}
}