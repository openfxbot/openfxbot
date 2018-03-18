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
	echo '"Currency","Position","Probability","Odds","Meets Criterion","File"' > report.csv
	mkdir -p ./downloads
	DIR_AGENTS=$(DIR_AGENTS) node report.js >> report.csv
	git checkout master
	node summarizer.js --time=${REPORT_DATE} | sort -rn

archive:
	git checkout eurusd
	git pull
	-mkdir -p ./archives
	ls ./neurons | awk '{print "DIR_AGENTS=./neurons node score.js --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	mkdir -p ./tmp
	echo "Score,Filename" > scores.csv
	./tmp.sh | sort -n | tee scores.csv
	node filter.js | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout usdchf
	git pull
	-mkdir -p ./archives
	ls ./neurons | awk '{print "DIR_AGENTS=./neurons node score.js --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	mkdir -p ./tmp
	echo "Score,Filename" > scores.csv
	./tmp.sh | sort -n | tee scores.csv
	node filter.js | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout usdjpy
	git pull
	-mkdir -p ./archives
	ls ./neurons | awk '{print "DIR_AGENTS=./neurons node score.js --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	mkdir -p ./tmp
	echo "Score,Filename" > scores.csv
	./tmp.sh | sort -n | tee scores.csv
	node filter.js | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout gbpusd
	git pull
	-mkdir -p ./archives
	ls ./neurons | awk '{print "DIR_AGENTS=./neurons node score.js --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	mkdir -p ./tmp
	echo "Score,Filename" > scores.csv
	./tmp.sh | sort -n | tee scores.csv
	node filter.js | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout audusd
	git pull
	-mkdir -p ./archives
	ls ./neurons | awk '{print "DIR_AGENTS=./neurons node score.js --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	mkdir -p ./tmp
	echo "Score,Filename" > scores.csv
	./tmp.sh | sort -n | tee scores.csv
	node filter.js | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout usdcad
	git pull
	-mkdir -p ./archives
	ls ./neurons | awk '{print "DIR_AGENTS=./neurons node score.js --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	mkdir -p ./tmp
	echo "Score,Filename" > scores.csv
	./tmp.sh | sort -n | tee scores.csv
	node filter.js | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout nzdusd
	git pull
	-mkdir -p ./archives
	ls ./neurons | awk '{print "DIR_AGENTS=./neurons node score.js --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	mkdir -p ./tmp
	echo "Score,Filename" > scores.csv
	./tmp.sh | sort -n | tee scores.csv
	node filter.js | awk '{print $$1, "./archives/"}' | xargs -n 2 mv
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: archive'
	git checkout master
	make push

unarchive:
	git checkout eurusd
	git pull
	mv ./archives/* ./neurons/
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: unarchive'
	git checkout usdchf
	git pull
	mv ./archives/* ./neurons/
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: unarchive'
	git checkout usdjpy
	git pull
	mv ./archives/* ./neurons/
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: unarchive'
	git checkout gbpusd
	git pull
	mv ./archives/* ./neurons/
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: unarchive'
	git checkout audusd
	git pull
	mv ./archives/* ./neurons/
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: unarchive'
	git checkout usdcad
	git pull
	mv ./archives/* ./neurons/
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: unarchive'
	git checkout nzdusd
	git pull
	mv ./archives/* ./neurons/
	git add -A ./neurons
	git add ./archives
	-git commit -m 'fix: unarchive'
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
	rm -rf ./agents
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

filter:
	ls $(DIR_AGENTS) | awk '{print "DIR_AGENTS=$(DIR_AGENTS) node score.js --config-file=" $$1}' > ./tmp.sh
	chmod a+x ./tmp.sh
	mkdir -p ./tmp
	echo "Score,Filename" > scores.csv
	./tmp.sh >> scores.csv
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
	git checkout usdcad
	git pull
	CURRENCY=USDCAD node download.js > ./data.js
	git commit -a -m 'fix: update data.js'
	git checkout nzdusd
	git pull
	CURRENCY=NZDUSD node download.js > ./data.js
	git commit -a -m 'fix: update data.js'
	git checkout master
	make compile
	make filter
	make update

reset:
	git checkout $(CURRENCY)
	git pull
	-rm -rf ./neurons/*.json
	-git add -A ./neurons
	-git commit -m 'fix: reset'
	echo '"File","Travis Job Id","Cycles","Wealth","Success","Decisions(JSON)"' > results.csv
	-git add results.csv
	-rm -rf ./archives/*
	-git add -A ./archives
	-git commit -m 'fix: reset'

clean:
	make reset CURRENCY=eurusd
	make reset CURRENCY=usdchf
	make reset CURRENCY=usdjpy
	make reset CURRENCY=gbpusd
	make reset CURRENCY=audusd
	make reset CURRENCY=usdcad
	make reset CURRENCY=nzdusd
	git checkout master
	make push
