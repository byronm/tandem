REPORTER = list

test:
	@./node_modules/.bin/mocha tests/*.coffee --reporter $(REPORTER) --compilers coffee:coffee-script

coverage:
	@rm -rf src-js src-js-cov
	@./node_modules/.bin/coffee -c -o src-js src
	@jscoverage src-js src-js-cov
	@TANDEM_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html
	@rm -rf src-js src-js-cov

.PHONY: test
