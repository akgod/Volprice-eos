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
    this.prices =[];
    this.tradeId = 0;
    this.askPrice = 0;
    this.bidPrice = 0;
  }
  async run() {
    console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}]`);
    let resInfo = await order.getaggTrades("BTCUSDT");
    let res = resInfo[0];
    //console.log("res= ",res);
    if(this.prices.length <20){
      if(res.a > this.tradeId ){
         this.prices.push(parseFloat(res.p));
         this.tradeId = res.a;
         console.log("TradeID=",this.tradeId);
      }
      return;
    }else{
      if(res.a <= this.tradeId ){return; }
      this.tradeId = res.a;
      this.prices.shift();
      console.log("newtradinfo-----",this.tradeId,"  price=",res.p);
      this.prices.push(parseFloat(res.p));
      let orderBook = await order.depth("BTCUSDT");
      this.bidPrice = orderBook.bids[0][0] * 0.618 + orderBook.asks[0][0] * 0.382 + 0.01;
      this.askPrice = orderBook.bids[0][0] * 0.382 + orderBook.asks[0][0] * 0.618 - 0.01;
      this.prices.shift();
      let newPrice = (parseFloat(orderBook.bids[0][0]) + parseFloat(orderBook.asks[0][0])) * 0.35 +
                      (parseFloat(orderBook.bids[1][0]) + parseFloat(orderBook.asks[1][0])) * 0.1 +
                       (parseFloat(orderBook.bids[2][0]) + parseFloat(orderBook.asks[2][0])) * 0.05 ;

      console.log("newPrice=",newPrice);                     
      this.prices.push(newPrice);
    }
    //console.log(this.prices);

    let burstPrice = 0.68;
    if (
      this.prices[this.prices.length-1] - _.max(this.prices.slice(-6, -1)) > burstPrice ||
      this.prices[this.prices.length-1] - _.max(this.prices.slice(-6, -2)) > burstPrice && this.prices[this.prices.length-1] > this.prices[this.prices.length-2]
      ){
      // let usdtbalance = await redis.get("USDTBalance");
      // if(usdtbalance < 0.002*parseFloat(this.bidPrice)){
      //    console.log("USDT 余额不足");
      //    return;
      // }
      let buyorderid = await order.limitBuy("BTCUSDT",0.002,this.bidPrice.toFixed(2));
      await sleep(200);
      while(true){
          let orderStatus = await order.orderStatus(buyorderid);
          if(orderStatus == "NEW"){
             let cancelStatus = await order.cancelOrder("BTCUSDT",buyorderid);
             if(cancelStatus == "CANCELED"){
                break;
             }    
          }
          if(orderStatus == "FILLED"){
             let stopProfit = await order.limitSell("BTCUSDT",0.002,(this.bidPrice + 1).toFixed(2));
             break;
          }
      }
      console.log("$$$$$$$$$$$牛来啦¥¥¥¥¥¥¥¥¥");
      console.log("$$$$$$$$$$$牛来啦¥¥¥¥¥¥¥¥¥");
      console.log("$$$$$$$$$$$牛来啦¥¥¥¥¥¥¥¥¥");
    } else if (
      this.prices[this.prices.length-1] - _.min(this.prices.slice(-6, -1)) < -burstPrice ||
      this.prices[this.prices.length-1] - _.min(this.prices.slice(-6, -2)) < -burstPrice && this.prices[this.prices.length-1] < this.prices[this.prices.length-2]
      ){
      //   let btcbalance = await redis.get("USDTBalance");
      //   if(btcbalance < 0.002){
      //     console.log("BTC 余额不足");
      //     return;
      //  }
        let sellorderid = await order.limitSell("BTCUSDT",0.002,this.askPrice.toFixed(2));
        await sleep(200);
        while(true){
          let orderStatus = await order.orderStatus(sellorderid);
          if(orderStatus == "NEW"){
             let cancelStatus = await order.cancelOrder("BTCUSDT",sellorderid);
             if(cancelStatus == "CANCELED"){
                break;
             }    
          }
          if(orderStatus == "FILLED"){
             let stopProfit = await order.limitBuy("BTCUSDT",0.002,(this.askPrice - 1).toFixed(2));
             break;
          }
        }
        console.log("-----------熊来啦---------");
        console.log("-----------熊来啦---------");
        console.log("-----------熊来啦---------");

     }

  }

  async start() {   
    // await redis.connect(); //连接redis  
    // let BTCBalance = await order.BTC();
    // let USDTBalance = await order.USDT();
    // await redis.set("BTCBalance",BTCBalance.toString());
    // await redis.set("USDTBalance",USDTBalance.toString());
    while (true) {
      this.count++;
      try {
        await this.run();
      } catch (e) {
        console.error(e);
      }
      await sleep(100);
    }
  }
}
new Runner().start();
