require("./sdk/global");
const config = require("config");
const _ = require("lodash");
const moment = require("moment");
const order =require("./order");
const fs = require("fs");
const redis = require("./redis");

class Runner {
  constructor() {
    this.count = 0;
  }

  async run() {
    console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}]`);

    const data = JSON.parse(fs.readFileSync('symbol.json', 'utf-8'));

    for(let i=0;i<data.length;i++){     
      let symbol = data[i];
      let OrderPrice = await redis.get(symbol);
      if(OrderPrice !=0){
        let nowPrice = await order.latestprice(symbol);
        let coinValue = await order.coinValue(symbol);
        if(coinValue < 10){
          console.log(symbol,"估值太低,orderprice重置为0");
          await redis.set(symbol,"0");       //如果持仓太小，orderprice重置为0
          continue;
        }  
       
        let stopLossPrice = OrderPrice * (1 - config.app.stopspace);
        let stopProfitPrice = OrderPrice * (1 + config.app.profitspace);
        console.log(symbol,"  nowPrice==",nowPrice,"  stopLossPrice==",stopLossPrice.toFixed(8),"  stopProfitPrice==",stopProfitPrice.toFixed(8));


        //---------止损------------
        if(nowPrice < stopLossPrice){
          let coinBalance = await order.coinBalance(symbol);
          let quantityPrecision = await redis.get(symbol + "_precision");
          let orderVolume = coinBalance.toFixed(quantityPrecision);
          await order.marketSell(symbol,orderVolume);//.then(console.log);
          await redis.set(symbol,"0");
        }
        //---------止盈------------
        if(coinValue < config.app.orderusdtanount/2){  //盈利平仓2次后，不再止盈 ，只移动止损
          console.log(symbol,"让利润奔跑吧。。。。");
          continue;
        } 
        if(nowPrice > stopProfitPrice){

          let coinBalance = await order.coinBalance(symbol);
          let quantityPrecision = await redis.get(symbol + "_precision");
          let orderVolume = (coinBalance *0.5).toFixed(quantityPrecision);   //止盈一半仓位

          await order.marketSell(symbol,orderVolume);//.then(console.log);
          let newOrderPrice = OrderPrice * (1+ config.app.profitspace/1.5);
          await redis.set(symbol,newOrderPrice.toString());
        }


      }
    } 
    //fs.appendFileSync("./"  + "risk.json",JSON.stringify(orderSymbol),{ encoding:"utf8", flag:"a" } );
  }

  async start() {    
    await redis.connect();
    while (true) {
      this.count++;
      try {
        await this.run();
      } catch (e) {
        console.error(e);
      }
      await sleep(config.app.risksleep);
    }
  }
}
new Runner().start();
