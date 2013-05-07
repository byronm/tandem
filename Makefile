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
	@./node_modules/.bin/mocha tests/*.coffee --reporter json-cov --compilers coffee:coffee-script | node scripts/jsoncovtohtmlcov > coverage.html
	@rm -rf src/*
	@mv tmp/backup/* src/
	@rm -rf tmp

test:
	@./node_modules/.bin/mocha tests/*.coffee --reporter $(REPORTER) --compilers coffee:coffee-script
	