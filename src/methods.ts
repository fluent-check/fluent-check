import {MySum} from './externalClass'

export const assertion = ({a, b}) => {
  const tmp = new MySum()
  return tmp.mySum(a,b) === a + b
}
