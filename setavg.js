const _ = require("lodash");
const rp = require('request-promise');
const moment = require("moment");
const fs = require('fs');
const redis = require("./redis");
const order =require("./order");


const SpotHostName = "https://api.binance.com";

class binance {
  constructor() {
    this.onoff = 0;
  }
  async Spot(){ 
    let DateTime = new Date();
    let dateMin = DateTime.getMinutes();
    let noun = dateMin%5;
    if (noun !=0){this.onoff = 0;}
    console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}]`);
    console.log("dateMin=",dateMin);
    console.log("noun=",noun);
    console.log("onoff=",this.onoff);

    // const bulldata = ["BTCUSDT","ETHUSDT"];
    // const fiveK =[];
    // let limit = 2;
    // let fiveMinterval = "5m";
    // for(let i=0;i<bulldata.length;i++){     
    //         let symbol = bulldata[i];
    //         let fiveMklineurl = SpotHostName + "/api/v3/klines?symbol=" + symbol + "&interval=" + fiveMinterval+ "&limit="+limit;  
    //         let fiveMklineoptions = {
    //           url: fiveMklineurl,
    //           method: "get",
    //           json: true,
    //           headers: { "Accept": "application/json"},
    //         };
    //         fiveK.push(rp(fiveMklineoptions)); 
  
    // }   

    // await Promise.all(fiveK).then(result=>{
    //     async function setBullBear(){


    //           volumeSum = volumeSum + parseFloat(result[j][m][5]);
    //           priceChange = priceChange + (parseFloat(result[j][m][2]) - parseFloat(result[j][m][3]))/parseFloat(result[j][m][3]);

              
    //           console.log("==========================");

    //           let key_avgVolume = symbol + "_avgVolume";
    //           await redis.set(key_avgVolume,avgVolume.toString());
    //           console.log(symbol," set success!");  
    //     }
    //     setBullBear();
    // });
    
    if(noun ==0 && this.onoff ==0){     

          const data = JSON.parse(fs.readFileSync('symbol.json', 'utf-8'));
          const fiveK =[];
          let limit = 20;
          let fiveMinterval = "5m";
          for(let i=0;i<data.length;i++){     
                  let symbol = data[i];
                  let fiveMklineurl = SpotHostName + "/api/v3/klines?symbol=" + symbol + "&interval=" + fiveMinterval+ "&limit="+limit;  
                  let fiveMklineoptions = {
                    url: fiveMklineurl,
                    method: "get",
                    json: true,
                    headers: { "Accept": "application/json"},
                  };
                  fiveK.push(rp(fiveMklineoptions)); 
        
          }   

          await Promise.all(fiveK).then(result=>{
              async function setavg(){
                  for(let j=0;j<data.length;j++){
                      let volumeSum = 0;
                      let priceChange = 0;
                      let symbol = data[j];
                      for(let m=0;m<limit-1;m++){
                          volumeSum = volumeSum + parseFloat(result[j][m][5]);
                          priceChange = priceChange + (parseFloat(result[j][m][2]) - parseFloat(result[j][m][3]))/parseFloat(result[j][m][3]);

                      }
                      let avgVolume = volumeSum / (limit-1);
                      let avgPriceChange = priceChange / (limit-1);
                    
                      console.log("==========================");
                      // console.log("SYMBOL=",data[j]);
                      // console.log("openprice=",result[j][limit-1][1]);
                      console.log("avgVolume=",avgVolume);
                      console.log("avgPriceChange=",avgPriceChange);
                      let key_avgVolume = symbol + "_avgVolume";
                      await redis.set(key_avgVolume,avgVolume.toString());
                      let key_avgPriceChange = symbol + "_avgPriceChange";
                      await redis.set(key_avgPriceChange,avgPriceChange.toString());
                      console.log(symbol," set success!");
                      // console.log("result[j][limit-1][4]=",result[j][limit-1][4]);
                      // console.log("result[j][limit-1][1]=",result[j][limit-1][1]);
                      // console.log("nowVolume=",nowVolume);
                      // console.log("nowPriceChange = ",nowPriceChange);

                  }
              }
              setavg();
          });

          this.onoff = 1;

   
    }

    console.log("----");

  }  


  async start() {   
      await redis.connect(); //连接redis  
      //await order.OrderPriceSet();
    
    
      while (true) {
        try {
          await this.Spot();
        } catch (e) {
          console.error(e);
        }
        await sleep(1000);
      }
  }


}





//new Runner().start();
new binance().start();
//ba.Spot().then(console.log);
//ba.coinInfo('ALCXUSDT').then(console.log);


