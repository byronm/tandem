test:
	@./node_modules/.bin/mocha tests/*.coffee --reporter list --compilers coffee:coffee-script

.PHONY: test
