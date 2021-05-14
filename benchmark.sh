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

RUNS=3
PROJECT_DIR="${PWD}/src/benchmarks/"
CONFIGURATIONS=(
  "PBT_R_S1" "PBT_R_S2" "PBT_R_S3" "PBT_R_S4" "PBT_R_S5" "PBT_R_S6" "PBT_R_S7" "PBT_R_S8"
  "PBT_CG_S1" "PBT_CG_S2" "PBT_CG_S3" "PBT_CG_S4" "PBT_CG_S5" "PBT_CG_S6" "PBT_CG_S7" "PBT_CG_S8"
)

Reporter() {
  pct=$((($1*100/($VERSIONS*$RUNS*${#CONFIGURATIONS[*]}))))
  trc=$(($pct*20/100))
  
  prg="${LIGHTGREEN}$(date +"%T") INFO Benchmark$(tput sgr0) Benchmarking ["
  for (( prg_counter=0; prg_counter<20; prg_counter++ ))
  do
    if [ $prg_counter -lt $trc ];
    then
      prg+="="
    else
      prg+="-"
    fi
  done
  prg+="] (" 
  prg+=$pct
  prg+="%)\r"
  echo -ne $prg
}

if [ $# -ne 1 ];
then
  echo -e "\n${LIGHTGREEN}$(date +"%T") INFO Benchmark$(tput sgr0) Usage: benchmark <PROJECT>\n"
  exit 1
fi

PROJECT_DIR+=$1

if ! [ -d "$PROJECT_DIR" ]; then
  echo -e "\n${LIGHTGREEN}$(date +"%T") INFO Benchmark$(tput sgr0) Invalid benchmark project: ${RED}\"$PROJECT_DIR\"$(tput sgr0) does not exist.\n"
  exit 1
else
  echo -e "\n${LIGHTGREEN}$(date +"%T") INFO Benchmark$(tput sgr0) Project found."
fi

PROJECT_VERSIONS_DIR="$PROJECT_DIR/latest"
VERSIONS=$(ls -l $PROJECT_VERSIONS_DIR | grep -c ^d)

if [ $VERSIONS -lt 1 ];
then
  echo -e "${LIGHTGREEN}$(date +"%T") INFO Benchmark$(tput sgr0) No mutated versions found: ${RED}\"$PROJECT_VERSIONS_DIR\"$(tput sgr0) is empty.\n"
  exit 1
else
  echo -e "${LIGHTGREEN}$(date +"%T") INFO Benchmark$(tput sgr0) Found ${LIGHTGRAY}$VERSIONS$(tput sgr0) mutated versions of the ${LIGHTGRAY}$1$(tput sgr0) project."
fi

export FLUENT_CHECK_PROJECT=$1
export FLUENT_CHECK_EXTRACTION_PATH="$PROJECT_DIR/original/main.ts"
export FLUENT_CHECK_SPECIFICATION_PATH="${PWD}/test/benchmarks/$1/specification.test.ts"

mv "$PROJECT_DIR/original/main.ts" "$PROJECT_DIR/original/main-backup.ts"

ITERATION=0
echo -ne "\n${LIGHTGREEN}$(date +"%T") INFO Benchmark$(tput sgr0) Benchmarking [--------------------] (0%)\r"

for (( vc=0; vc<$VERSIONS; vc++ ))
do
  export FLUENT_CHECK_MUTATION_ID=$vc
  cp "$PROJECT_VERSIONS_DIR/$vc/main.ts" "$PROJECT_DIR/original/"
  for (( rc=0; rc<$RUNS; rc++ ))
  do
    export FLUENT_CHECK_RUN=$rc
    for (( cc=0; cc<${#CONFIGURATIONS[*]}; cc++ ))
    do
      export FLUENT_CHECK_CONFIGURATION=${CONFIGURATIONS[$cc]}
      npm run benchmark --silent > /dev/null
      ((ITERATION++))
      Reporter $ITERATION
    done
  done
done

echo -ne "${LIGHTGREEN}$(date +"%T") INFO Benchmark$(tput sgr0) Benchmarking [====================] (100%)\n\n"

mv "$PROJECT_DIR/original/main-backup.ts" "$PROJECT_DIR/original/main.ts"