// Support Webhook Button
document.getElementById('supportBtn').addEventListener('click', function(){
    fetch('https://discord.com/api/webhooks/1288171367161790474/oL7RLe0YietJSPtCJPrKVDvFePrMmjgh2muUPk1QfLJtjEZSjKoCWtuWyUGhRL_glyhW', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
            username: "Roger Support",
            content: "A user reported an issue with Stan's Beat Bot! Check immediately."
        })
    }).then(()=>alert('Roger sent your report to support! 🚀'))
      .catch(()=>alert('Could not notify support 😢'));
});
