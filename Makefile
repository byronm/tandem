REPORTER = list

cov:
	@mv src src-back
	@./node_modules/.bin/coffee -co src/ src-back/
	@TANDEM_COV=1 istanbul cover ./node_modules/.bin/_mocha tests/unit/*.coffee --root build/ -- --compilers coffee:coffee-script
	@rm -rf src/
	@mv src-back src

fuzzer:
	@./node_modules/.bin/mocha tests/fuzzer.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

test:
	@./node_modules/.bin/mocha tests/unit/*.coffee tests/unit/*/*.coffee --reporter $(REPORTER) --compilers coffee:coffee-script/register
