#!/bin/bash

RUNS=1
PROJECT_DIR="${PWD}/src/benchmarks/"
CONFIGURATIONS=(
  "PBT_R_S1" "PBT_R_S2" "PBT_R_S3" "PBT_R_S4" "PBT_R_S5" "PBT_R_S6" "PBT_R_S7" "PBT_R_S8"
  "PBT_CG_S1" "PBT_CG_S2" "PBT_CG_S3" "PBT_CG_S4" "PBT_CG_S5" "PBT_CG_S6" "PBT_CG_S7" "PBT_CG_S8"
)

if [ $# -ne 1 ];
then
  echo "$(tput bold)usage:$(tput sgr0) benchmark <PROJECT>"
  exit 1
fi

PROJECT_DIR+=$1

if ! [ -d "$PROJECT_DIR" ]; then
  echo "$(tput bold)Invalid benchmark project$(tput sgr0) :: \"$PROJECT_DIR\" does not exist."
  exit 1
fi

PROJECT_VERSIONS_DIR="$PROJECT_DIR/latest"
VERSIONS=$(ls -l $PROJECT_VERSIONS_DIR | grep -c ^d)

if [ $VERSIONS -lt 1 ];
then
  echo "$(tput bold)No mutated versions found$(tput sgr0) :: \"$PROJECT_VERSIONS_DIR\" is empty."
  exit 1
fi

export FLUENT_CHECK_PROJECT=$1
export FLUENT_CHECK_EXTRACTION_PATH="$PROJECT_DIR/original/main.ts"
export FLUENT_CHECK_SPECIFICATION_PATH="${PWD}/test/benchmarks/$1/specification.test.ts"

mv "$PROJECT_DIR/original/main.ts" "$PROJECT_DIR/original/main-backup.ts"

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
      printf "######### BEGIN #########\n"
      printf "> Project: $1\n> Configuration: ${CONFIGURATIONS[$cc]}\n> Version: $vc\n> Run: $rc\n"
      npm run test --silent > /dev/null
      printf "########## END ##########\n\n"
    done
  done
done

mv "$PROJECT_DIR/original/main-backup.ts" "$PROJECT_DIR/original/main.ts"
