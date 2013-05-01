REPORTER = list

test:
	@./node_modules/.bin/mocha tests/*.coffee --reporter $(REPORTER) --compilers coffee:coffee-script
	