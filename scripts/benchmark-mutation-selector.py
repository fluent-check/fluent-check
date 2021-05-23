import sys, random, math, numbers

MAX_NUM_MUTATIONS = 5

class Colors:
    LIGHTGREEN='\033[1;32m'
    LIGHTGRAY='\033[0;37m'
    NOCOLOR='\033[0m'

if len(sys.argv) < 2:
    print('\n' + Colors.LIGHTGREEN + 'INFO Benchmark Mutation Selector ' + Colors.NOCOLOR + 'Usage: python benchmark-mutation-selector.py <LIMIT> [<SEED>]\n')
    sys.exit()

LIMIT = int(sys.argv[1])
SEED  = int(sys.argv[2]) if len(sys.argv) == 3 else math.floor(random.random() * 0x100000000)

# Set random seed
random.seed(SEED)

ids = []

while MAX_NUM_MUTATIONS > 0:
    id = math.floor(random.random() * LIMIT) + 1
    if id not in ids:
        ids.append(id)
        MAX_NUM_MUTATIONS -= 1

print('\n' + Colors.LIGHTGREEN + 'INFO Benchmark Mutation Selector ' + Colors.NOCOLOR + 'Seed: ' + Colors.LIGHTGRAY + str(SEED))
print(Colors.LIGHTGREEN + 'INFO Benchmark Mutation Selector ' + Colors.NOCOLOR + 'Mutations identifiers: ' + Colors.LIGHTGRAY, end='')
print(ids, end='\n\n')
