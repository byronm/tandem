REPORTER = list

cov:
	@rm -rf build/client
	@./node_modules/.bin/coffee -c -o build/client/ src/client/*.coffee
	@TANDEM_COV=1 ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha tests/unit/*.coffee --root build/ -- --compilers coffee:coffee-script
	@rm -rf build/client

fuzzer:
	@./node_modules/.bin/mocha tests/fuzzer.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test:
	@./node_modules/.bin/mocha tests/unit/*.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test-connect:
	@./node_modules/.bin/mocha tests/unit/connect.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test-engine:
	@./node_modules/.bin/mocha tests/unit/engine.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test-message:
	@./node_modules/.bin/mocha tests/unit/message.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test-storage:
	@./node_modules/.bin/mocha tests/unit/storage.coffee --reporter $(REPORTER) --compilers coffee:coffee-script
