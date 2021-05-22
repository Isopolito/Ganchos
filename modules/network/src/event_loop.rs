use crate::gmcp;

pub struct Params {
	pub iteration_sleep_ms: u64,
	pub should_exit: bool,
	pub should_pause: bool,
	pub should_show_default_config: bool,
	pub should_show_example_config: bool,
	pub config_json: String,
}
impl Params {
	pub fn new_with_defaults() -> Params {
		Params {	
			iteration_sleep_ms: 0,
			should_exit: false,
			should_pause: false,
			config_json: String::new(),
			should_show_default_config: false,
			should_show_example_config: false,
		}
	}

	pub fn new(commands: &Vec<gmcp::Command>) -> Params {
		let mut params = Params::new_with_defaults();

		if commands.len() == 0 {
			return params;
		}

		for command in commands {
			if command.command_type == gmcp::CommandType::STOP {
				params.should_exit = true;
			} else if command.command_type == gmcp::CommandType::THROTTLE {
				let throttle_val = match command.data.parse::<u64>() {
					Ok(v) => v,
					Err(_) => 0,
				};
				params.iteration_sleep_ms = 5 * throttle_val;
			} else if command.command_type == gmcp::CommandType::PAUSE {
				params.should_pause = true;
			} else if command.command_type == gmcp::CommandType::UPDATE_CONFIG {
				params.config_json = String::from(&command.data);
			} else if command.command_type == gmcp::CommandType::SHOW_DEFAULT_CONFIG {
				params.should_show_default_config = true;
			} else if command.command_type == gmcp::CommandType::SHOW_EXAMPLE_CONFIG {
				params.should_show_example_config = true;
			}
		}

		params
	}
}