neuron:
	node index.js --min-sensitivity=${MIN_SENSITIVITY} --max-sensitivity=${MAX_SENSITIVITY} --min-alpha=${MIN_ALPHA} --max-alpha=${MAX_ALPHA} --min-gamma=${MIN_GAMMA} --max-gamma=${MAX_GAMMA} --min-epsilon=${MIN_EPSILON} --max-epsilon=${MAX_EPSILON} --test-size=${TEST_SIZE} --min-states=${MIN_STATES} --output-file=${OUTPUT_FILENAME} | tee -a ./results.csv
	git config --global user.email ${GIT_EMAIL}
	git config --global user.name "Travis CI"
	git checkout -b travis
	git add .
	git commit -a -m 'test: new neuron'

report:
	echo '"Currency","Position","Probability","Odds","Meets Criterion","File"' > report.csv
	git fetch origin
	git checkout origin/eurusd
	ls neurons | awk '{print "node report.js --currency=eurusd --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout origin/usdjpy
	ls neurons | awk '{print "node report.js --currency=usdjpy --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout origin/usdchf
	ls neurons | awk '{print "node report.js --currency=usdchf --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout origin/gbpusd
	ls neurons | awk '{print "node report.js --currency=gbpusd --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout origin/audusd
	ls neurons | awk '{print "node report.js --currency=audusd --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout origin/usdcad
	ls neurons | awk '{print "node report.js --currency=usdcad --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout origin/nzdusd
	ls neurons | awk '{print "node report.js --currency=nzdusd --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout master
	node parse.js | sort -rn

archive:
	git checkout eurusd
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	git commit -m 'fix: archive'
	git checkout usdchf
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	git commit -m 'fix: archive'
	git checkout usdjpy
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	git commit -m 'fix: archive'
	git checkout gbpusd
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	git commit -m 'fix: archive'
	git checkout audusd
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	git commit -m 'fix: archive'
	git checkout usdcad
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	git commit -m 'fix: archive'
	git checkout nzdusd
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	git commit -m 'fix: archive'
	git checkout master
	make push

merge:
	git checkout eurusd
	git pull
	git merge master
	git checkout usdchf
	git pull
	git merge master
	git checkout usdjpy
	git pull
	git merge master
	git checkout gbpusd
	git pull
	git merge master
	git checkout audusd
	git pull
	git merge master
	git checkout usdcad
	git pull
	git merge master
	git checkout nzdusd
	git pull
	git merge master
	git checkout master
	make push

push:
	git push origin eurusd:eurusd && git push origin usdchf:usdchf && git push origin usdjpy:usdjpy && git push origin gbpusd:gbpusd && git push origin audusd:audusd && git push origin usdcad:usdcad && git push origin nzdusd:nzdusd

backtest:
	echo 'TBD'

report-local:
	echo '"Currency","Position","Probability","Odds","Meets Criterion","File"' > report.csv
	git checkout eurusd
	ls neurons | awk '{print "node report.js --currency=eurusd --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout usdjpy
	ls neurons | awk '{print "node report.js --currency=usdjpy --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout usdchf
	ls neurons | awk '{print "node report.js --currency=usdchf --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout gbpusd
	ls neurons | awk '{print "node report.js --currency=gbpusd --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout audusd
	ls neurons | awk '{print "node report.js --currency=audusd --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout usdcad
	ls neurons | awk '{print "node report.js --currency=usdcad --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout nzdusd
	ls neurons | awk '{print "node report.js --currency=nzdusd --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
	git checkout master
	node parse.js | sort -rn
