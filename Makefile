DIR_AGENTS?=./agents

neuron:
	node index.js --min-sensitivity=${MIN_SENSITIVITY} --max-sensitivity=${MAX_SENSITIVITY} --min-alpha=${MIN_ALPHA} --max-alpha=${MAX_ALPHA} --min-gamma=${MIN_GAMMA} --max-gamma=${MAX_GAMMA} --min-epsilon=${MIN_EPSILON} --max-epsilon=${MAX_EPSILON} --test-size=${TEST_SIZE} --min-states=${MIN_STATES} --output-file=${OUTPUT_FILENAME} | tee -a ./results.csv
	git config --global user.email ${GIT_EMAIL}
	git config --global user.name "Travis CI"
	git checkout -b travis
	git add .
	git commit -a -m 'test: new neuron'

report:
	cp report.js compiler.js
	echo '"Currency","Position","Probability","Odds","Meets Criterion","File"' > report.csv
	$(MAKE) data CURRENCY=EURUSD
	$(MAKE) data CURRENCY=GBPUSD
	$(MAKE) data CURRENCY=NZDUSD
	$(MAKE) data CURRENCY=AUDUSD
	$(MAKE) data CURRENCY=USDCHF
	$(MAKE) data CURRENCY=USDCAD
	$(MAKE) data CURRENCY=USDJPY
	git checkout master
	node parse.js | sort -rn

archive:
	git checkout eurusd
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout usdchf
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout usdjpy
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout gbpusd
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout audusd
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout usdcad
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout nzdusd
	git pull
	-mkdir -p ./archives
	grep -o '"meetsCriterion":false' ./neurons/* | cut -f 1 -d : | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
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

compile:
	git fetch origin
	mkdir -p ./agents
	git checkout origin/eurusd
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/eurusd-" $$1}' | xargs -n 2 cp
	git checkout origin/audusd
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/audusd-" $$1}' | xargs -n 2 cp
	git checkout origin/gbpusd
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/gbpusd-" $$1}' | xargs -n 2 cp
	git checkout origin/nzdusd
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/nzdusd-" $$1}' | xargs -n 2 cp
	git checkout origin/usdjpy
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/usdjpy-" $$1}' | xargs -n 2 cp
	git checkout origin/usdchf
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/usdchf-" $$1}' | xargs -n 2 cp
	git checkout origin/usdcad
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/usdcad-" $$1}' | xargs -n 2 cp
	git checkout master
	make report DIR_AGENTS='./agents'
	git checkout master

data:
	mkdir -p ./downloads

	CURRENCY=${CURRENCY} node download.js > ./downloads/${CURRENCY}.js
	ls $(DIR_AGENTS) | awk '{print "DIR_AGENTS=$(DIR_AGENTS) node compiler.js --data=./downloads/${CURRENCY}.js --currency=${CURRENCY} --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv
