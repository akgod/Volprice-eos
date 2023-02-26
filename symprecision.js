const SpotHostName = "https://api.binance.com";
const rp = require('request-promise');
const fs = require("fs");

const redis = require("./redis");

class CexBa {

      async coinInfo(){
          const data = JSON.parse(fs.readFileSync('symbol.json', 'utf-8'));
          await redis.connect();


          for(let i=0;i<data.length;i++){ 
               let symbol = data[i];

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
               console.log("--------************-----------");

              //  console.log(result.symbols[0].filters);
               console.log(result.symbols[0].filters[1].stepSize);
              let noun = 1/result.symbols[0].filters[1].stepSize;
              let quantityPrecision = Math.log10(noun);
              console.log(symbol,"_precision = ",quantityPrecision);
              //console.log(typeof(quantityPrecision));
              // let i = 1.23456;
              // console.log(i.toFixed(quantityPrecision));
              // console.log(typeof(i.toFixed(quantityPrecision)));

              let key = symbol + "_precision";
              await redis.set(key,quantityPrecision.toString());
              console.log(symbol,"下单精度写入成功");

              await sleep(700);

              //return quantityPrecision;
          }
          console.log("-------------------");
          console.log("-------------------");
          console.log("-------------------");
          console.log("交易对精度写入--完成");

      }

}



let ba = new CexBa();
module.exports = ba;
ba.coinInfo(); //.then(console.log)
