REPORTER = list

cov:
	@rm -rf build/client
	@./node_modules/.bin/coffee -co build/client/ src/client/
	@TANDEM_COV=1 ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha tests/unit/*.coffee --root build/ -- --compilers coffee:coffee-script
	@rm -rf build/client

fuzzer:
	@./node_modules/.bin/mocha tests/fuzzer.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test:
	@./node_modules/.bin/mocha tests/unit/*.coffee tests/unit/*/*.coffee --reporter $(REPORTER) --compilers coffee:coffee-script
