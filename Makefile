neuron:
	node index.js --min-alpha=${MIN_ALPHA} --max-alpha=${MAX_ALPHA} --min-gamma=${MIN_GAMMA} --max-gamma=${MAX_GAMMA} --min-epsilon=${MIN_EPSILON} --max-epsilon=${MAX_EPSILON} --test-size=${TEST_SIZE} --min-states=${MIN_STATES} --output-file=${OUTPUT_FILENAME} | tee -a ./results.csv
	git config --global user.email ${GIT_EMAIL}
	git config --global user.name "Travis CI"
	git checkout -b travis
	git add .
	git commit -a -m 'test: new neuron'

report:
	echo '"Currency","Position","Probability","Odds","File"' > report.csv
	git fetch origin
	git checkout origin/eurusd
	ls neurons | awk '{print "node report.js --currency=eurusd --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout origin/usdjpy
	ls neurons | awk '{print "node report.js --currency=usdjpy --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout origin/eurjpy
	ls neurons | awk '{print "node report.js --currency=eurjpy --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout master
	node parse.js

merge:
	git checkout eurusd
	git pull
	git merge master
	git checkout eurjpy
	git pull
	git merge master
	git checkout usdjpy
	git pull
	git merge master
	git checkout master
	make push

push:
	git push origin eurusd:eurusd && git push origin eurjpy:eurjpy && git push origin usdjpy:usdjpy

backtest:
	echo 'TBD'
