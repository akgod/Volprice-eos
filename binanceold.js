const _ = require("lodash");
const config = require("config");
const rp = require('request-promise');
const CryptoJS = require('crypto-js');  
const moment = require("moment");
const { result, memoize } = require("lodash");
const fs = require('fs');
const { syncBuiltinESMExports } = require("module");

const SpotHostName = "https://api.binance.com";

class binance {
  async Spot(){    
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

    const ordersymbol=[];

    await Promise.all(fiveK).then(result=>{
          for(let j=0;j<data.length;j++){
              let volumeSum=0;
              let priceChange =0;
              for(let m=0;m<limit-1;m++){
                  volumeSum = volumeSum + parseFloat(result[j][m][5]);
                  priceChange = priceChange + (parseFloat(result[j][m][2]) - parseFloat(result[j][m][3]))/parseFloat(result[j][m][3]);

              }
              //console.log("volumeSum=",volumeSum);
              let avgVolume = volumeSum / (limit-1);
             // let priceChangePercent = (parseFloat(result[j][limit-1][4]) - parseFloat(result[j][limit-1][1]))/parseFloat(result[j][limit-1][1]);
              let avgPriceChange = priceChange / (limit-1);
              let nowVolume = parseFloat(result[j][limit-1][5]);
              let nowPriceChange = (parseFloat(result[j][limit-1][4]) - parseFloat(result[j][limit-1][1]))/parseFloat(result[j][limit-1][1]);
              // console.log("==========================");
              // console.log("SYMBOL=",data[j]);
              // console.log("openprice=",result[j][limit-1][1]);
              // console.log("avgVolume=",avgVolume);
              // console.log("avgPriceChange=",avgPriceChange);
              // console.log("result[j][limit-1][4]=",result[j][limit-1][4]);
              // console.log("result[j][limit-1][1]=",result[j][limit-1][1]);
              // console.log("nowVolume=",nowVolume);
              // console.log("nowPriceChange = ",nowPriceChange);
              if(nowVolume > (config.app.avgVolumeNoun*avgVolume) && nowPriceChange > config.app.avgPriceChangeNoun * avgPriceChange && nowPriceChange > config.app.priceChangePercent){
                  // console.log("==========================");
                  // console.log("==#########################==");
                  // console.log("======########################=======");
                  // console.log("SYMBOL=",data[j]);
                  // console.log("openprice=",result[j][limit-1][1]);
                  // console.log("avgVolume=",avgVolume);
                  // console.log("avgPriceChange=",avgPriceChange);
                  // console.log("nowPriceChange",nowPriceChange);    
                  // console.log("nowVolume=",nowVolume); 
                  ordersymbol.push(data[j]);
               }
           }
          //  console.log("==========================");
    });

    if(ordersymbol.length >0){
      console.log("$$$$$$$$$$$yes yes yes$$$$$$$$$$$$$$$");
      //console.log(ordersymbol);
      return ordersymbol;
    }else{
      console.log("-----nonono--------");
      return false;
    }

  }  

  async coinInfo(symbol){
    let exchangeInfourl = SpotHostName + "/api/v3/exchangeInfo?symbol=" + symbol ;  
    let exchangeInfooptions = {
      url: exchangeInfourl,
      method: "get",
      json: true,
      headers: { "Accept": "application/json"},
    };
    let result = await rp(exchangeInfooptions);  
    // console.log(result);
    // console.log("-------------------");
    // console.log(typeof(result));
    // console.log("--------************-----------");

    // console.log(result.symbols[0].filters[2]);
    // console.log(result.symbols[0].filters[2].stepSize);
    let noun = 1/result.symbols[0].filters[2].stepSize;
    let quantityPrecision = Math.log10(noun);
    //console.log(typeof(quantityPrecision));
    // let i = 1.23456;
    // console.log(i.toFixed(quantityPrecision));
    // console.log(typeof(i.toFixed(quantityPrecision)));

    return quantityPrecision;
  }


}

let ba = new binance();
module.exports = ba;

//ba.Spot().then(console.log);
//ba.coinInfo('ALCXUSDT').then(console.log);


