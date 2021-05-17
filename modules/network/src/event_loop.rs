use crate::gmcp;

pub struct Params {
	pub iteration_sleep_ms: u64,
	pub should_exit: bool,
	pub should_pause: bool,
}
impl Params {
	pub fn new_with_defaults() -> Params {
		Params {	
			iteration_sleep_ms: 0,
			should_exit: false,
			should_pause: false,
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
			}
		}

		params
	}
}