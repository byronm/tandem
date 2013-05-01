REPORTER = list

test:
	@./node_modules/.bin/mocha tests/server/*.coffee --reporter $(REPORTER) --compilers coffee:coffee-script
	