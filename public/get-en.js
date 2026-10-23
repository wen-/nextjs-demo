

// 延迟函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchUsersWithDelay() {
  let total=0;
  const results = {};
    var count=5000;
  
  for (let i=0; i<count; i++) {
    try {
      
      const response = await fetch("https://lms.ouchn.cn/api/exams/1574265/distribute", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
            "priority": "u=1, i",
            "sec-ch-ua": "\"Microsoft Edge\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
        },
        "referrer": "https://lms.ouchn.cn/exam/1574265/subjects",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
        });
      const exam = await response.json();
      
      exam.subjects.forEach(element => {
        if(!results[element.id]){
            total++;
            results[element.id]=element;
        }
      });
      if(total >= 1584){
        break;
      }
      
      await sleep(50);
      
    } catch (error) {
      console.error(`获取数据失败:`, error);
    }
  }
  
  console.log('所有请求完成，共', Object.keys(results).length, '条数据');
  return results;
}

fetchUsersWithDelay();