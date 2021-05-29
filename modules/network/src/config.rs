use serde::{Serialize, Deserialize};
use serde_json::Result;

use crate::filters::{Filter, RegexFilter};

#[derive(Serialize, Deserialize)]
pub struct Config {
	pub filters: Vec<Filter>,
}
impl Config {
	pub fn make_from_json(json: &str) -> Config {
		match serde_json::from_str(json) as Result<Config> {
			Ok(config) => config,
			Err(_) => Config::make_default(),
		}
	}

	pub fn make_default() -> Config {
		Config {
			filters: vec![],
		}
	}

	pub fn make_example() -> Config {
		Config {
			filters: vec![
				Filter {
					protocol: String::from("ip4"),
					min_size: 10,
					max_size: 100,
					port: 0,
					regex_filter: RegexFilter::new(
						"32.232.232.323",
						"192.*",
						"",
					),
				},
				Filter {
					protocol: String::from("udp"),
					min_size: 0,
					max_size: 0,
					port: 1169,
					regex_filter: RegexFilter::new(
						"*",
						"92.158.29.191",
						".*hello.*",
					),
				}
			],
		}
	}
}