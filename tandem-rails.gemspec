# -*- encoding: utf-8 -*-
require File.expand_path('../lib/tandem-rails/version', __FILE__)

Gem::Specification.new do |gem|
  gem.authors       = ["Jason Chen", "Byron Milligan"]
  gem.email         = ["support@stypi.com"]
  gem.description   = "Tandem realtime library for Rails 3"
  gem.summary       = "Tandem realtime library for Rails 3"
  gem.homepage      = "https://github.com/stypi/tandem"

  gem.files         = Dir["{lib,vendor}/**/*"] + ["README.md"]
  gem.name          = "tandem-rails"
  gem.require_paths = ["lib"]
  gem.version       = Tandem::Rails::VERSION

  gem.add_dependency "railties", "~> 3.1"
  gem.add_dependency "async-rails", "~> 1.0.1"
end
