/**
 * Publish and/or vote news on the network
 * @param {fake.news.biz.PublishNews} publish - the publishment/vote to be processed
 * @transaction
*/
 async function publish(publish){
     const publisher = publish.publisher;

     //add error handling for this method

     const factory = getFactory();
     const news = factory.newResource('fake.news.biz', 'News', publish.news_id);

     news.title = publish.news_title;
     news.desc = publish.news_desc;
     news.sources = publish.news_sources;
     news.validated = false;

     const vote = factory.newConcept('fake.news.biz', 'Vote');
     vote.voter = publisher;
     vote.vote = publish.vote;
     vote.publishment = true;

     news.votes = [];
     news.votes.push(vote);

     const newsRegistry = await getAssetRegistry('fake.news.biz.News');
     await newsRegistry.add(news);

     //emit the event about the transaction
 }


 /**
  * Vote news on the network
  * @param {fake.news.biz.VoteNews} voteNews - the vote to be processed
  * @transaction
 */
  async function vote(voteNews){

    const factory = getFactory();

    if(publish.news.validated == true){
      throw new Error('Cant vote on news that has already been validated');
    }

    const vote = factory.newConcept('fake.news.biz', 'Vote');
    vote.voter = voteNews.voter;
    vote.vote = voteNews.vote;
    vote.publishment = false;

    voteNews.news.votes.push(vote);

    const assetRegistry = await getAssetRegistry('fake.news.biz.News');
    await assetRegistry.update(voteNews.news);

    var byzantineFraction;
    var byzantineNrOfMembers;
    var result = null;

    const participantRegistry = await getParticipantRegistry('fake.news.biz.Member');
    const membersList = await participantRegistry.getAll();
    const votesList = voteNews.news.votes;
    const nrOfNewsValidations = votesList.length;

    //console.log('membersList length ' + membersList.length);
    for(var i = 0; i < nrOfNewsValidations; i++){
      if(votesList[i].publishment == true){
         if(votesList[i].voter.rating < 7 && votesList[i].voter.rating >= 0){
             byzantineFraction = 0.6;
         }
         else if(votesList[i].voter.rating < 9 && votesList[i].voter.rating >= 7){
             byzantineFraction = 0.3;
         }
         //console.log('Byzantine Fraction' + byzantineFraction);
         byzantineNrOfMembers = membersList.length * byzantineFraction;
      }
    }

    if(nrOfNewsValidations >= byzantineNrOfMembers){
        console.log('Entrou para verificar consenso ...');
        console.log('Número Bizantino de consenso: ' + byzantineNrOfMembers);
        var countTrue = 0;
        var countFalse = 0;

        for(var j = 0; j < nrOfNewsValidations; j++){
          if(votesList[j].vote == true){
             countTrue++;
          } else {
             countFalse++;
          }
          if(countTrue >= byzantineNrOfMembers){
             result = true;
             break;
          } else if(countFalse >= byzantineNrOfMembers){
             result = false;
             break;
            }
         }

      }

    if(result != null){
      var updateFactorNumber = (membersList.length - nrOfNewsValidations) * 0.01;
      for(var k = 0; k < nrOfNewsValidations; i++){
          if(result == votesList[k].vote){
              votesList[k].voter.rating = votesList[k].voter.rating + updateFactorNumber;

              if(votesList[k].publishment == true){
              	votesList[k].voter.rating = votesList[k].voter.rating + 0.2;
              }

              if(votesList[k].voter.rating > 10){
              	votesList[k].voter.rating = 10;
              }

              await participantRegistry.update(votesList[k].voter);
          }
          else {
              votesList[k].voter.rating = votesList[k].voter.rating - updateFactorNumber;

  			      if(votesList[k].publishment == true){
              	votesList[k].voter.rating = votesList[k].voter.rating - 1;
              }

            	if(votesList[k].voter.rating < 3){
              	votesList[k].voter.banned = true;
              }

              await participantRegistry.update(votesList[k].voter);
          }
      }
    }

    if(result == true){

       console.log('News validated as true');
       voteNews.news.validated = true;
       voteNews.news.validationResult = true;
       await assetRegistry.update(voteNews.news);

    } else if(result == false){

       console.log('News validated as false');
       voteNews.news.validated = true;
       voteNews.news.validationResult = false;
       await assetRegistry.update(voteNews.news);

    }

    //emit the event about the transaction

  }
