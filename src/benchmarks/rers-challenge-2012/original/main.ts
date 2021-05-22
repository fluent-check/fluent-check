export class Problem1 {
	private inputs: string[] = ['A','D','E','F','C','B']
	private a17: boolean = true
	private a7: boolean = false
	private a20: boolean = true
	private a8: string = 'g'
	private a12: string = 'e'
	private a16: string = 'f'
	private a21: boolean = true

    public getInputs(): string[] {
        return this.inputs
    }

	public calculateOutput(input: string): string | null {
	    if((!this.a7&&(this.a17&&((this.a16==='g'&&(!this.a20&&((input===this.inputs[3]&&this.a12==='e')&&this.a21)))&&this.a8==='g')))) {
	    	this.a7 = true
	    	this.a20 = true
	    	this.a16 = 'e'
	    	this.a8 = 'e'
	    	return null
	    } else if(((!this.a7&&(((this.a16==='g'&&(this.a21&&(this.a17&&input===this.inputs[4])))&&!this.a20)&&this.a8==='g'))&&this.a12==='e')){
	    	this.a20 = true
	    	this.a8 = 'e'
	    	this.a16 = 'e'
	    	this.a7 = true
	    	return null
	    } else if((((((this.a16==='g'&&((!this.a20&&(!this.a17&&!this.a7))&&this.a8==='g'))&&this.a21)||((this.a16==='e'&&(((this.a7&&this.a17)&&this.a20)&&this.a8==='e'))&&!this.a21))&&input===this.inputs[1])&&this.a12==='e')){
	    	this.a21 = true
	    	this.a8 = 'f'
	    	this.a7 = true
	    	this.a17 = false
	    	this.a16 = 'f'
	    	this.a20 = true
	    	return null
	    } else if((((((this.a16==='g'&&((!this.a20&&(!this.a17&&!this.a7))&&this.a8==='g'))&&this.a21)||((this.a16==='e'&&((this.a20&&(this.a17&&this.a7))&&this.a8==='e'))&&!this.a21))&&input===this.inputs[5])&&this.a12==='e')){
	    	this.a21 = true
	    	this.a17 = false
	    	this.a7 = false
	    	this.a16 = 'e'
	    	this.a20 = true
	    	this.a8 = 'f'
	    	return null
	    } else if((((this.a8==='g'&&(!this.a7&&((((!this.a20&&this.a17)&&this.a16==='e')||(((!this.a17&&this.a20)&&this.a16==='f')||(this.a16==='g'&&(this.a20&&!this.a17))))&&input===this.inputs[3])))&&this.a12==='e')&&this.a21)){
	    	this.a20 = false
	    	this.a16 = 'e'
	    	this.a17 = true
	    	return 'V'
	    } else if((((this.a21&&(this.a8==='g'&&(this.a12==='e'&&(!this.a7&&(!this.a17&&input===this.inputs[5])))))&&this.a16==='e')&&this.a20)){
	    	this.a7 = true
	    	this.a17 = true
	    	this.a8 = 'e'
	    	return null
	    } else if((this.a8==='e'&&(!this.a21&&((((((!this.a17&&this.a20)&&this.a16==='g')||(this.a16==='e'&&(this.a17&&!this.a20)))&&input===this.inputs[2])&&this.a7)&&this.a12==='e')))){
	    	this.a16 = 'e'
	    	this.a17 = true
	    	this.a20 = false
	    	return 'Y'
	    } else if((((this.a8==='e'&&(this.a12==='e'&&(((((this.a16==='g'&&this.a17)||(!this.a17&&this.a16==='e'))||(!this.a17&&this.a16==='f'))&&input===this.inputs[0])&&!this.a21)))&&this.a20)&&this.a7)){
	    	this.a20 = false
	    	this.a7 = false
	    	this.a8 = 'g'
	    	this.a16 = 'g'
	    	this.a17 = true
	    	this.a21 = true
	    	return null
	    } else if((this.a12==='e'&&(this.a7&&(!this.a21&&(this.a8==='e'&&(input===this.inputs[3]&&((this.a16==='g'&&(this.a20&&!this.a17))||(this.a16==='e'&&(this.a17&&!this.a20))))))))){
	    	this.a20 = false
	    	this.a17 = false
	    	this.a21 = true
	    	this.a8 = 'f'
	    	this.a16 = 'e'
	    	return null
	    } else if(((!this.a7&&(!this.a17&&((((input===this.inputs[4]&&this.a21)&&this.a16==='e')&&this.a8==='g')&&this.a12==='e')))&&!this.a20)){
	    	this.a17 = true
	    	this.a20 = true
	    	this.a7 = true
	    	this.a8 = 'e'
	    	return null
	    } else if((this.a17&&((!this.a7&&((this.a21&&(((this.a16==='f'||this.a16==='g')&&input===this.inputs[3])&&this.a20))&&this.a8==='g'))&&this.a12==='e'))){
	    	this.a16 = 'e'
	    	this.a8 = 'e'
	    	this.a7 = true
	    	return null
	    } else if(((this.a12==='e'&&((this.a21&&(((input===this.inputs[2]&&!this.a7)&&this.a8==='g')&&this.a16==='f'))&&!this.a20))&&!this.a17)){
	    	this.a8 = 'e'
	    	this.a17 = true
	    	this.a20 = true
	    	this.a16 = 'e'
	    	this.a7 = true
	    	return null
	    } else if(((this.a16==='f'&&(!this.a20&&((((input===this.inputs[3]&&this.a21)&&this.a17)&&!this.a7)&&this.a12==='e')))&&this.a8==='g')){
	    	return 'X'
	    } else if((this.a17&&((this.a21&&(!this.a20&&(this.a12==='e'&&(this.a8==='g'&&(!this.a7&&input===this.inputs[0])))))&&this.a16==='g'))){
	    	this.a20 = true
	    	this.a8 = 'e'
	    	this.a7 = true
	    	this.a16 = 'e'
	    	return null
	    } else if(((!this.a7&&(!this.a17&&(((this.a16==='e'&&(this.a8==='g'&&input===this.inputs[0]))&&this.a12==='e')&&this.a21)))&&this.a20)){
	    	this.a17 = true
	    	this.a7 = true
	    	this.a8 = 'e'
	    	return null
	    } else if(((this.a21&&(!this.a7&&((!this.a20&&(!this.a17&&(this.a12==='e'&&input===this.inputs[3])))&&this.a16==='e')))&&this.a8==='g')){
	    	this.a20 = true
	    	this.a16 = 'g'
	    	return 'V'
	    } else if(((this.a12==='e'&&(((!this.a17&&(this.a21&&(input===this.inputs[1]&&!this.a7)))&&this.a8==='g')&&this.a20))&&this.a16==='e')){
	    	this.a16 = 'g'
	    	this.a20 = false
	    	this.a17 = true
	    	return 'U'
	    } else if(((this.a21&&(!this.a7&&(((((this.a16==='f'&&(this.a20&&!this.a17))||((!this.a17&&this.a20)&&this.a16==='g'))||(this.a16==='e'&&(this.a17&&!this.a20)))&&input===this.inputs[1])&&this.a12==='e')))&&this.a8==='g')){
	    	this.a17 = false
	    	this.a16 = 'e'
	    	this.a20 = false
	    	return 'X'
	    } else if(((!this.a7&&((this.a21&&((this.a17&&(this.a12==='e'&&input===this.inputs[5]))&&!this.a20))&&this.a16==='g'))&&this.a8==='g')){
	    	this.a16 = 'e'
	    	this.a8 = 'e'
	    	this.a7 = true
	    	this.a20 = true
	    	return null
	    } else if((((!this.a7&&((!this.a20&&(this.a21&&(input===this.inputs[4]&&this.a17)))&&this.a8==='g'))&&this.a12==='e')&&this.a16==='f')){
	    	this.a8 = 'e'
	    	this.a7 = true
	    	this.a20 = true
	    	this.a16 = 'e'
	    	return null
	    } else if((((this.a8==='e'&&((((!this.a21&&input===this.inputs[3])&&this.a20)&&this.a12==='e')&&this.a17))&&this.a7)&&this.a16==='f')){
	    	this.a20 = false
	    	this.a16 = 'e'
	    	return 'Y'
	    } else if((this.a20&&((this.a12==='e'&&(this.a7&&(this.a8==='e'&&(((!this.a17&&this.a16==='f')||((this.a17&&this.a16==='g')||(!this.a17&&this.a16==='e')))&&input===this.inputs[4]))))&&!this.a21))){
	    	this.a7 = false
	    	this.a17 = true
	    	this.a16 = 'e'
	    	this.a8 = 'f'
	    	this.a21 = true
	    	return null
	    } else if((((this.a20&&(((!this.a21&&(this.a7&&input===this.inputs[0]))&&this.a8==='e')&&this.a17))&&this.a12==='e')&&this.a16==='f')){
	    	this.a7 = false
	    	this.a21 = true
	    	this.a16 = 'g'
	    	return null
	    } else if((this.a8==='g'&&((this.a16==='e'&&(this.a12==='e'&&((!this.a20&&(!this.a7&&input===this.inputs[0]))&&!this.a17)))&&this.a21))){
	    	this.a16 = 'g'
	    	this.a20 = true
	    	return 'V'
	    } else if((!this.a7&&((this.a8==='g'&&((!this.a17&&(this.a12==='e'&&(input===this.inputs[4]&&this.a21)))&&this.a16==='e'))&&this.a20))){
	    	this.a8 = 'e'
	    	this.a7 = true
	    	this.a17 = true
	    	return null
	    } else if(((this.a17&&((this.a21&&((!this.a7&&(input===this.inputs[1]&&this.a8==='g'))&&!this.a20))&&this.a12==='e'))&&this.a16==='g')){
	    	this.a17 = false
	    	return 'Z'
	    } else if((this.a7&&(this.a8==='e'&&(this.a12==='e'&&(!this.a21&&(input===this.inputs[5]&&(((this.a20&&!this.a17)&&this.a16==='g')||((this.a17&&!this.a20)&&this.a16==='e')))))))){
	    	this.a20 = false
	    	this.a16 = 'e'
	    	this.a17 = true
	    	return null
	    } else if((this.a16==='f'&&((((this.a12==='e'&&(!this.a7&&(input===this.inputs[5]&&!this.a20)))&&this.a21)&&this.a17)&&this.a8==='g'))){
	    	this.a17 = false
	    	return 'X'
	    } else if((this.a12==='e'&&(input===this.inputs[0]&&((this.a21&&((this.a8==='g'&&((!this.a17&&!this.a7)&&!this.a20))&&this.a16==='g'))||(!this.a21&&(this.a16==='e'&&(this.a8==='e'&&((this.a17&&this.a7)&&this.a20)))))))){
	    	this.a8 = 'e'
	    	this.a21 = false
	    	this.a7 = true
	    	this.a17 = true
	    	this.a16 = 'f'
	    	this.a20 = true
	    	return 'Z'
	    } else if(((((!this.a17&&(!this.a20&&(this.a8==='g'&&(input===this.inputs[0]&&this.a16==='f'))))&&this.a12==='e')&&this.a21)&&!this.a7)){
	    	return null
	    } else if(((input===this.inputs[4]&&(((this.a16==='g'&&((!this.a20&&(!this.a7&&!this.a17))&&this.a8==='g'))&&this.a21)||(((this.a8==='e'&&(this.a20&&(this.a17&&this.a7)))&&this.a16==='e')&&!this.a21)))&&this.a12==='e')){
	    	this.a20 = true
	    	this.a21 = true
	    	this.a8 = 'e'
	    	this.a7 = false
	    	this.a17 = true
	    	this.a16 = 'e'
	    	return null
	    } else if((this.a12==='e'&&((((((this.a21&&input===this.inputs[2])&&this.a8==='g')&&this.a17)&&!this.a7)&&!this.a20)&&this.a16==='g'))){
	    	this.a16 = 'e'
	    	this.a7 = true
	    	this.a20 = true
	    	this.a8 = 'e'
	    	return null
	    } else if((this.a17&&(((((this.a12==='e'&&(input===this.inputs[1]&&this.a8==='e'))&&this.a20)&&!this.a21)&&this.a16==='f')&&this.a7))){
	    	this.a17 = false
	    	this.a16 = 'e'
	    	return 'Y'
	    } else if(((!this.a17&&(this.a21&&((!this.a20&&(this.a12==='e'&&(input===this.inputs[4]&&!this.a7)))&&this.a8==='g')))&&this.a16==='f')){
	    	this.a16 = 'e'
	    	this.a8 = 'e'
	    	return null
	    } else if(((!this.a21&&(this.a20&&(((this.a8==='e'&&(this.a7&&input===this.inputs[2]))&&this.a17)&&this.a12==='e')))&&this.a16==='f')){
	    	this.a17 = false
	    	this.a21 = true
	    	this.a8 = 'f'
	    	this.a20 = false
	    	this.a7 = false
	    	return null
	    } else if(((this.a8==='g'&&((((this.a21&&((this.a16==='f'||this.a16==='g')&&input===this.inputs[0]))&&this.a20)&&this.a17)&&!this.a7))&&this.a12==='e')){
	    	this.a16 = 'f'
	    	this.a20 = false
	    	return 'X'
	    } else if((this.a21&&((this.a12==='e'&&(((this.a17&&(input===this.inputs[4]&&(this.a16==='f'||this.a16==='g')))&&!this.a7)&&this.a20))&&this.a8==='g'))){
	    	this.a16 = 'e'
	    	this.a17 = false
	    	return 'U'
	    } else if((((((((!this.a20&&(!this.a17&&!this.a7))&&this.a8==='g')&&this.a16==='g')&&this.a21)||(((this.a8==='e'&&((this.a17&&this.a7)&&this.a20))&&this.a16==='e')&&!this.a21))&&input===this.inputs[3])&&this.a12==='e')){
	    	this.a8 = 'e'
	    	this.a17 = false
	    	this.a16 = 'e'
	    	this.a7 = false
	    	this.a20 = true
	    	this.a21 = true
	    	return null
	    } else if((this.a17&&(!this.a7&&((this.a21&&((this.a12==='e'&&(input===this.inputs[2]&&(this.a16==='f'||this.a16==='g')))&&this.a20))&&this.a8==='g')))){
	    	this.a8 = 'e'
	    	this.a16 = 'e'
	    	this.a7 = true
	    	return null
	    } else if(((!this.a21&&(((((this.a16==='g'&&(this.a20&&!this.a17))||((this.a17&&!this.a20)&&this.a16==='e'))&&input===this.inputs[1])&&this.a7)&&this.a12==='e'))&&this.a8==='e')){
	    	this.a8 = 'g'
	    	this.a21 = true
	    	this.a16 = 'g'
	    	this.a17 = false
	    	this.a20 = false
	    	this.a7 = false
	    	return 'Z'
	    } else if(((this.a16==='f'&&(((this.a8==='g'&&((!this.a7&&input===this.inputs[5])&&this.a21))&&this.a12==='e')&&!this.a20))&&!this.a17)){
	    	this.a17 = true
	    	this.a16 = 'e'
	    	return 'X'
	    } else if((!this.a20&&(this.a21&&(this.a16==='e'&&(this.a8==='g'&&((this.a12==='e'&&(input===this.inputs[5]&&!this.a7))&&!this.a17)))))){
	    	this.a16 = 'f'
	    	this.a17 = true
	    	return 'U'
	    } else if((((this.a21&&(this.a8==='g'&&((this.a16==='f'&&(this.a12==='e'&&input===this.inputs[0]))&&this.a17)))&&!this.a7)&&!this.a20)){
	    	return 'U'
	    } else if((((this.a21&&(this.a12==='e'&&(input===this.inputs[0]&&(((!this.a20&&this.a17)&&this.a16==='e')||((this.a16==='f'&&(!this.a17&&this.a20))||(this.a16==='g'&&(!this.a17&&this.a20)))))))&&!this.a7)&&this.a8==='g')){
	    	this.a17 = false
	    	this.a20 = true
	    	this.a16 = 'g'
	    	return 'X'
	    } else if((!this.a20&&((((((input===this.inputs[3]&&this.a16==='f')&&this.a21)&&!this.a17)&&this.a12==='e')&&!this.a7)&&this.a8==='g'))){
	    	this.a17 = true
	    	return 'X'
	    } else if((((!this.a7&&(this.a21&&(((input===this.inputs[3]&&this.a20)&&this.a8==='g')&&!this.a17)))&&this.a12==='e')&&this.a16==='e')){
	    	this.a17 = true
	    	this.a8 = 'e'
	    	this.a7 = true
	    	return null
	    } else if((this.a16==='f'&&((!this.a21&&((this.a8==='e'&&((input===this.inputs[5]&&this.a20)&&this.a12==='e'))&&this.a7))&&this.a17))){
	    	this.a7 = false
	    	this.a8 = 'f'
	    	this.a20 = false
	    	this.a17 = false
	    	this.a21 = true
	    	this.a16 = 'e'
	    	return null
	    } else if((!this.a21&&(this.a20&&((this.a12==='e'&&(this.a8==='e'&&(((this.a16==='f'&&!this.a17)||((this.a17&&this.a16==='g')||(!this.a17&&this.a16==='e')))&&input===this.inputs[5])))&&this.a7)))){
	    	this.a17 = true
	    	this.a8 = 'g'
	    	this.a21 = true
	    	this.a16 = 'g'
	    	this.a7 = false
	    	this.a20 = false
	    	return null
	    } else if((!this.a7&&((((this.a21&&((this.a8==='g'&&input===this.inputs[2])&&!this.a17))&&this.a12==='e')&&this.a20)&&this.a16==='e'))){
	    	this.a17 = true
	    	this.a7 = true
	    	this.a8 = 'e'
	    	return null
	    } else if((((!this.a7&&((input===this.inputs[5]&&(((this.a16==='f'&&(this.a20&&!this.a17))||(this.a16==='g'&&(this.a20&&!this.a17)))||(this.a16==='e'&&(!this.a20&&this.a17))))&&this.a8==='g'))&&this.a12==='e')&&this.a21)){
	    	this.a20 = true
	    	this.a16 = 'f'
	    	this.a17 = false
	    	return 'Y'
	    } else if((this.a8==='e'&&(!this.a21&&(((input===this.inputs[4]&&(((this.a20&&!this.a17)&&this.a16==='g')||((!this.a20&&this.a17)&&this.a16==='e')))&&this.a12==='e')&&this.a7)))){
	    	this.a16 = 'e'
	    	this.a20 = true
	    	this.a17 = true
	    	return 'Z'
	    } else if((this.a8==='g'&&(this.a16==='e'&&(!this.a20&&(((this.a21&&(!this.a17&&input===this.inputs[2]))&&!this.a7)&&this.a12==='e'))))){
	    	this.a7 = true
	    	this.a8 = 'e'
	    	this.a20 = true
	    	this.a17 = true
	    	return null
	    } else if((this.a17&&(this.a12==='e'&&(this.a8==='g'&&(((!this.a7&&((this.a16==='f'||this.a16==='g')&&input===this.inputs[5]))&&this.a21)&&this.a20))))){
	    	this.a16 = 'g'
	    	this.a17 = false
	    	return 'V'
	    } else if((this.a12==='e'&&(input===this.inputs[2]&&((((((!this.a17&&!this.a7)&&!this.a20)&&this.a8==='g')&&this.a16==='g')&&this.a21)||(!this.a21&&(this.a16==='e'&&((this.a20&&(this.a7&&this.a17))&&this.a8==='e'))))))){
	    	this.a17 = false
	    	this.a8 = 'f'
	    	this.a20 = false
	    	this.a21 = true
	    	this.a16 = 'f'
	    	this.a7 = true
	    	return null
	    } else if((this.a7&&(this.a12==='e'&&(((this.a20&&(((!this.a17&&this.a16==='f')||((this.a17&&this.a16==='g')||(this.a16==='e'&&!this.a17)))&&input===this.inputs[1]))&&this.a8==='e')&&!this.a21)))){
	    	this.a7 = false
	    	this.a8 = 'g'
	    	this.a17 = false
	    	this.a21 = true
	    	this.a20 = false
	    	this.a16 = 'g'
	    	return 'Z'
	    } else if(((((this.a12==='e'&&((((this.a17&&!this.a20)&&this.a16==='e')||(((this.a20&&!this.a17)&&this.a16==='f')||((!this.a17&&this.a20)&&this.a16==='g')))&&input===this.inputs[4]))&&this.a8==='g')&&this.a21)&&!this.a7)){
	    	this.a8 = 'e'
	    	this.a16 = 'e'
	    	this.a20 = true
	    	this.a17 = true
	    	this.a7 = true
	    	return null
	    } else if(((!this.a21&&((this.a12==='e'&&(((this.a16==='g'&&(this.a20&&!this.a17))||((!this.a20&&this.a17)&&this.a16==='e'))&&input===this.inputs[0]))&&this.a8==='e'))&&this.a7)){
	    	this.a20 = true
	    	this.a17 = false
	    	this.a16 = 'g'
	    	return null
	    } else if((!this.a17&&((this.a12==='e'&&(!this.a20&&((this.a8==='g'&&(this.a21&&input===this.inputs[1]))&&!this.a7)))&&this.a16==='f'))){
	    	this.a17 = true
	    	return 'X'
	    } else if((((!this.a7&&((input===this.inputs[2]&&(((this.a16==='f'&&(!this.a17&&this.a20))||(this.a16==='g'&&(this.a20&&!this.a17)))||(this.a16==='e'&&(!this.a20&&this.a17))))&&this.a12==='e'))&&this.a21)&&this.a8==='g')){
	    	this.a7 = true
	    	this.a8 = 'e'
	    	this.a20 = true
	    	this.a17 = true
	    	this.a16 = 'e'
	    	return null
	    } else if((this.a17&&((this.a8==='g'&&((this.a12==='e'&&((!this.a7&&input===this.inputs[2])&&this.a21))&&!this.a20))&&this.a16==='f'))){
	    	this.a16 = 'e'
	    	this.a7 = true
	    	this.a8 = 'e'
	    	this.a20 = true
	    	return null
	    } else if(((this.a16==='f'&&((this.a7&&((!this.a21&&(this.a12==='e'&&input===this.inputs[4]))&&this.a8==='e'))&&this.a17))&&this.a20)){
	    	this.a21 = true
	    	this.a17 = false
	    	this.a8 = 'g'
	    	this.a20 = false
	    	return null
	    } else if((this.a21&&((((!this.a7&&(this.a8==='g'&&(!this.a20&&input===this.inputs[1])))&&this.a17)&&this.a16==='f')&&this.a12==='e'))){
	    	return 'X'
	    } else if(((this.a12==='e'&&(!this.a21&&(this.a7&&(this.a8==='e'&&(input===this.inputs[3]&&(((this.a16==='g'&&this.a17)||(this.a16==='e'&&!this.a17))||(this.a16==='f'&&!this.a17)))))))&&this.a20)){
	    	this.a16 = 'e'
	    	this.a8 = 'g'
	    	this.a20 = false
	    	this.a17 = false
	    	this.a21 = true
	    	return null
	    } else if((this.a20&&(this.a12==='e'&&(((this.a17&&(((this.a16==='f'||this.a16==='g')&&input===this.inputs[1])&&this.a8==='g'))&&this.a21)&&!this.a7)))){
	    	this.a8 = 'e'
	    	this.a16 = 'e'
	    	this.a7 = true
	    	return null
	    } else if(((((!this.a17&&(!this.a7&&(this.a21&&(this.a8==='g'&&input===this.inputs[1]))))&&!this.a20)&&this.a12==='e')&&this.a16==='e')){
	    	this.a16 = 'f'
	    	this.a17 = true
	    	return 'U'
	    } else if(((((((input===this.inputs[2]&&(((this.a16==='g'&&this.a17)||(!this.a17&&this.a16==='e'))||(!this.a17&&this.a16==='f')))&&this.a20)&&this.a12==='e')&&this.a7)&&!this.a21)&&this.a8==='e')){
	    	this.a17 = false
	    	this.a20 = false
	    	this.a16 = 'g'
	    	this.a8 = 'g'
	    	this.a21 = true
	    	this.a7 = false
	    	return 'Z'
	    } 
	    if(((((((!this.a17&&this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_20'
	    } 
	    if(((((((this.a17&&!this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_47'
	    } 
	    if(((((((!this.a17&&this.a7)&&!this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_32' 
	    } 
	    if(((((((this.a17&&!this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_37' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_56' 
	    } 
	    if(((((((!this.a17&&this.a7)&&!this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_33' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_57' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_50' 
	    } 
	    if(((((((this.a17&&!this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_35' 
	    } 
	    if(((((((!this.a17&&this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_15' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_38' 
	    } 
	    if(((((((!this.a17&&this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_21' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_44' 
	    } 
	    if(((((((this.a17&&!this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_41' 
	    } 
	    if(((((((this.a17&&this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_19' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_40' 
	    } 
	    if(((((((!this.a17&&this.a7)&&this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_27' 
	    } 
	    if(((((((this.a17&&!this.a7)&&this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_59' 
	    } 
	    if(((((((!this.a17&&this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_2' 
	    } 
	    if(((((((this.a17&&this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_1' 
	    } 
	    if(((((((this.a17&&this.a7)&&!this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_31' 
	    } 
	    if(((((((!this.a17&&this.a7)&&this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_28' 
	    } 
	    if(((((((this.a17&&this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_5' 
	    } 
	    if(((((((this.a17&&this.a7)&&this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_23' 
	    } 
	    if(((((((!this.a17&&this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_4' 
	    } 
	    if(((((((this.a17&&this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'globalError' 
	    } 
	    if(((((((this.a17&&this.a7)&&this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_24' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_58' 
	    } 
	    if(((((((this.a17&&this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_18' 
	    } 
	    if(((((((this.a17&&this.a7)&&!this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_29' 
	    } 
	    if(((((((this.a17&&!this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_36' 
	    } 
	    if(((((((!this.a17&&this.a7)&&this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_26' 
	    } 
	    if(((((((this.a17&&this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_7' 
	    } 
	    if(((((((!this.a17&&this.a7)&&!this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_34' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_51' 
	    } 
	    if(((((((this.a17&&!this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_49' 
	    } 
	    if(((((((this.a17&&this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_0' 
	    } 
	    if(((((((this.a17&&this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_11' 
	    } 
	    if(((((((!this.a17&&this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_10' 
	    } 
	    if(((((((this.a17&&!this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_55' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_46' 
	    } 
	    if(((((((!this.a17&&this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_8' 
	    } 
	    if(((((((this.a17&&!this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_53' 
	    } 
	    if(((((((this.a17&&!this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_42' 
	    } 
	    if(((((((this.a17&&this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_17' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_45' 
	    } 
	    if(((((((!this.a17&&this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_9' 
	    } 
	    if(((((((this.a17&&this.a7)&&this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_25' 
	    } 
	    if(((((((this.a17&&this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_12' 
	    } 
	    if(((((((this.a17&&!this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_48' 
	    } 
	    if(((((((this.a17&&!this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_54' 
	    } 
	    if(((((((this.a17&&this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_13' 
	    } 
	    if(((((((this.a17&&this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_6' 
	    } 
	    if(((((((this.a17&&this.a7)&&!this.a20)&&this.a8==='g')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_30' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_52' 
	    } 
	    if(((((((!this.a17&&this.a7)&&!this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_22' 
	    } 
	    if(((((((this.a17&&!this.a7)&&!this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_43' 
	    } 
	    if(((((((!this.a17&&this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_3' 
	    } 
	    if(((((((!this.a17&&this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='g')&&this.a21)){
	    	return 'error_16'
	    } 
	    if(((((((!this.a17&&this.a7)&&this.a20)&&this.a8==='f')&&this.a12==='e')&&this.a16==='e')&&this.a21)){
	    	return 'error_14' 
	    } 
	    if(((((((!this.a17&&!this.a7)&&this.a20)&&this.a8==='e')&&this.a12==='e')&&this.a16==='f')&&this.a21)){
	    	return 'error_39'
	    } 
	    return 'current state has not transition for this input!'
	}
}
