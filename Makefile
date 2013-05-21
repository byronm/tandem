REPORTER = list

coverage:
	@rm -rf tmp
	@mkdir tmp
	@mkdir tmp/coverage
	@mkdir tmp/backup
	@mkdir tmp/js
	@mv src/* tmp/backup/
	@./node_modules/.bin/coffee -co tmp/js/ tmp/backup/
	@jscoverage tmp/js/ tmp/coverage/
	@mv tmp/coverage/* src/
	@./node_modules/.bin/mocha tests/unit/*.coffee tests/fuzzer.coffee --reporter json-cov --compilers coffee:coffee-script | node scripts/jsoncovtohtmlcov > coverage.html
	@rm -rf src/*
	@mv tmp/backup/* src/
	@rm -rf tmp

fuzzer:
	@./node_modules/.bin/mocha tests/fuzzer.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test:
	@./node_modules/.bin/mocha tests/unit/*.coffee tests/fuzzer.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test-connect:
	@./node_modules/.bin/mocha tests/unit/connect.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test-message:
	@./node_modules/.bin/mocha tests/unit/message.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test-storage:
	@./node_modules/.bin/mocha tests/unit/storage.coffee --reporter $(REPORTER) --compilers coffee:coffee-script
