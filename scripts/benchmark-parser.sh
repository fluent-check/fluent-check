#!/bin/bash

# ----------------------------------
# Colors
# ----------------------------------
NOCOLOR='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
ORANGE='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
LIGHTGRAY='\033[0;37m'
DARKGRAY='\033[1;30m'
LIGHTRED='\033[1;31m'
LIGHTGREEN='\033[1;32m'
YELLOW='\033[1;33m'
LIGHTBLUE='\033[1;34m'
LIGHTPURPLE='\033[1;35m'
LIGHTCYAN='\033[1;36m'
WHITE='\033[1;37m'

PROJECT_DIR="${PWD}/src/benchmarks/"

if [ $# -lt 1 ];
then
  echo -e "\n${LIGHTGREEN}$(date +"%T") INFO Benchmark Parser$(tput sgr0) Usage: benchmark-parser <PROJECT> [-s || --satisfiability]\n"
  exit 1
fi

PROJECT_DIR+=$1

if ! [ -d "$PROJECT_DIR" ]; then
  echo -e "\n${LIGHTGREEN}$(date +"%T") INFO Benchmark Parser$(tput sgr0) Invalid benchmark project: ${RED}\"$PROJECT_DIR\"$(tput sgr0) does not exist.\n"
  exit 1
else
  echo -e "\n${LIGHTGREEN}$(date +"%T") INFO Benchmark Parser$(tput sgr0) Project found."
fi

export FLUENT_CHECK_PROJECT=$1

echo -ne "\n${LIGHTGREEN}$(date +"%T") INFO Benchmark Parser$(tput sgr0) Benchmarking [--------------------] (0%) (0/3 Steps)\r"

if [[ $2 = "-s" ]] || [[ $2 = "--satisfiability" ]];
then
  python ./scripts/benchmark-parser.py $2
else
  python ./scripts/benchmark-parser.py
fi

echo -ne "${LIGHTGREEN}$(date +"%T") INFO Benchmark Parser$(tput sgr0) Benchmarking [=======-------------] (33%) (1/3 Steps)\r"

if [[ $2 = "-s" ]] || [[ $2 = "--satisfiability" ]];
then
  python ./scripts/benchmark-anova-tukey.py $1 -S
else
  python ./scripts/benchmark-anova-tukey.py $1
fi

echo -ne "${LIGHTGREEN}$(date +"%T") INFO Benchmark Parser$(tput sgr0) Benchmarking [==============------] (66%) (2/3 Steps)\r"

python ./scripts/benchmark-data-assembler.py 

echo -ne "${LIGHTGREEN}$(date +"%T") INFO Benchmark Parser$(tput sgr0) Benchmarking [====================] (100%) (3/3 Steps)\n"
echo -ne "${LIGHTGREEN}$(date +"%T") INFO Benchmark Parser$(tput sgr0) Finished.\n\n"