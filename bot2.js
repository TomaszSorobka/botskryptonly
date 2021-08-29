const puppeteer = require('puppeteer');
const Datastore = require('nedb');

(async () => {
  const browser = await puppeteer.launch({headless: false, args: ["--no-sandbox", "--disable-setuid-sandbox"]});
  const page = await browser.newPage();
  await page.goto('https://hurt.handlosfera.pl/login');
  let link = 'https://hurt.handlosfera.pl/wszystkie.html'

  //CREDENTIALS
  let login = 'solvolyse@company-mails.com'
  let password = '0bae067b'
  // Variables
  let prodcount = '';
  let price;
  let pages = 0;
  let products;
  let stock;
  let productname;
  let setamount = '5000';
  let data = {
    productname: '',
    stock:'',
    price:'',
    date:''
  }
  let arrayofdata = [];
  const database = new Datastore('database.db');
  database.loadDatabase();
  const date = new Date();
  let day = date.getDate();
  if(day<10) day = '0'+day;
  let month = date.getMonth() +1;
  if(month<10) month = '0'+month;
  let year = date.getFullYear();
  let UTCdate = year.toString() +'-'+month.toString()+'-'+day.toString();
  console.log(UTCdate);

  //LOG IN to handlosfera
  await page.type('input[name="login"]', login);
  await page.type('input[type="password"]', password);

  await Promise.all([
    page.waitForNavigation(),
    await page.click('.redBtn')
  ]);

  await Promise.all([
    page.waitForNavigation(),
    await page.goto(link)
  ]);

  // Establishing the number of pages
  prodcount = await page.evaluate(
      () => document.querySelector('.prodcount').innerHTML
  );
  prodcount = prodcount.replace(/\D/g,'');
  pages = Math.ceil(prodcount/21);

  //OUTER LOOP for subpages
  for (let podstronki = 1; podstronki<pages+1; podstronki++) {
    await page.goto('https://hurt.handlosfera.pl/wszystkie' + podstronki + '.html');
    products = await page.$$('.singleProductContainer');

                //INNNER LOOP scraping the information
                for (let i = 0; i<products.length; i++) {
                  
                    //Entering the product
                    await Promise.all([
                    page.waitForNavigation(),
                    await products[i].click()
                    ]);
                    //Getting the product's name
                    productname = await page.evaluate(
                      () => document.querySelector('h1').innerHTML
                    );
                    //Getting the product's prize
                    price = await page.evaluate(
                      () => document.querySelector('.actualPrize').innerHTML
                    );
                    price = price.replace(/[^\d.-]/g, '');
                    price = parseFloat(price);
                    //Getting the product's quantity
                    stock = await page.evaluate(
                      () => document.querySelector('.greenPrice').innerHTML
                  );
                    stock = stock.replace(/\D/g,'');
                    // Sending a request if a product's quantity is listed as 99+
                    if (stock == 99) {
                      await page.type('#amount', setamount);
                      await page.click('.cartAddBtn');
                      await page.waitForTimeout(1000);
                      stock = await page.evaluate(
                        () => document.querySelector('.simplemodal-data').innerHTML
                    );
                    stock = stock.replace(/\D/g,'');
                    stock = stock/10000;
                    }
                    stock = parseInt(stock);
                    //Pushing the data into the array

                    data = {productname: productname, stock: stock, price: price, date: UTCdate};
                    arrayofdata.push(data);
                    database.insert(data);
                    console.log(data);

                    await Promise.all([
                    page.waitForNavigation(),
                    await page.goto('https://hurt.handlosfera.pl/wszystkie' + podstronki + '.html')
                    ]);
                    products = await page.$$('.singleProductContainer');
                    await page.waitForTimeout(60000);
                }

    console.log('The subpage of ' + link + ' number ' + podstronki + ' has been finished.')
    }
})();