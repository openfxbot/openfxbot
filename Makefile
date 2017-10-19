DIR_AGENTS?=./agents
AGENT_COUNT?=12

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
	$(MAKE) data CURRENCY=AUDUSD
	$(MAKE) data CURRENCY=USDCHF
	$(MAKE) data CURRENCY=USDJPY
	$(MAKE) data CURRENCY=EURGBP
	$(MAKE) data CURRENCY=EURAUD
	$(MAKE) data CURRENCY=EURCHF
	$(MAKE) data CURRENCY=EURJPY
	$(MAKE) data CURRENCY=GBPAUD
	$(MAKE) data CURRENCY=GBPCHF
	$(MAKE) data CURRENCY=GBPJPY
	$(MAKE) data CURRENCY=AUDCHF
	$(MAKE) data CURRENCY=AUDJPY
	$(MAKE) data CURRENCY=CHFJPY
	git checkout master
	node parse.js | sort -rn | awk '{print $$2}'

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
	git checkout master
	make push

push:
	git push origin eurusd:eurusd && git push origin usdchf:usdchf && git push origin usdjpy:usdjpy && git push origin gbpusd:gbpusd && git push origin audusd:audusd

backtest:
	echo 'TBD'

compile:
	git fetch origin
	mkdir -p ./agents
	git checkout origin/eurusd
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/eurusd-" $$1}' | xargs -n 2 cp
	ls ./archives | awk '{print "./archives/" $$1, "./agents/eurusd-" $$1}' | xargs -n 2 cp
	git checkout origin/audusd
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/audusd-" $$1}' | xargs -n 2 cp
	ls ./archives | awk '{print "./archives/" $$1, "./agents/audusd-" $$1}' | xargs -n 2 cp
	git checkout origin/gbpusd
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/gbpusd-" $$1}' | xargs -n 2 cp
	ls ./archives | awk '{print "./archives/" $$1, "./agents/gbpusd-" $$1}' | xargs -n 2 cp
	git checkout origin/usdjpy
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/usdjpy-" $$1}' | xargs -n 2 cp
	ls ./archives | awk '{print "./archives/" $$1, "./agents/usdjpy-" $$1}' | xargs -n 2 cp
	git checkout origin/usdchf
	ls ./neurons | awk '{print "./neurons/" $$1, "./agents/usdchf-" $$1}' | xargs -n 2 cp
	ls ./archives | awk '{print "./archives/" $$1, "./agents/usdchf-" $$1}' | xargs -n 2 cp
	git checkout master
	make filter DIR_AGENTS='./agents'
	make report DIR_AGENTS='./agents'

data:
	mkdir -p ./downloads

	CURRENCY=${CURRENCY} node download.js > ./downloads/${CURRENCY}.js
	ls $(DIR_AGENTS) | awk '{print "DIR_AGENTS=$(DIR_AGENTS) node compiler.js --data=./downloads/${CURRENCY}.js --currency=${CURRENCY} --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	./tmp.sh | sort | tee -a report.csv

filter:
	ls $(DIR_AGENTS) | awk '{print "DIR_AGENTS=$(DIR_AGENTS) node score.js --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	mkdir -p ./tmp
	echo "Score,Filename" > scores.csv
	./tmp.sh | sort -n | tee scores.csv
	node filter.js | xargs rm

update:
	git checkout eurusd
	git pull
	CURRENCY=EURUSD node download.js > ./data.js
	git commit -a -m 'fix: update data.js'
	git checkout usdchf
	git pull
	CURRENCY=USDCHF node download.js > ./data.js
	git commit -a -m 'fix: update data.js'
	git checkout usdjpy
	git pull
	CURRENCY=USDJPY node download.js > ./data.js
	git commit -a -m 'fix: update data.js'
	git checkout gbpusd
	git pull
	CURRENCY=GBPUSD node download.js > ./data.js
	git commit -a -m 'fix: update data.js'
	git checkout audusd
	git pull
	CURRENCY=AUDUSD node download.js > ./data.js
	git commit -a -m 'fix: update data.js'
	git checkout master
	make push
