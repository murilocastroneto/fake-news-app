/**
 * Publish and/or vote news on the network
 * @param {fake.news.biz.Publish_Vote} publish_vote - the publishment/vote to be processed
 * @transaction
*/
 async function publishVote(publish_vote){
     var validators = publish_vote.news.validators;
     var voter = publish_vote.voter;
     var sources = publish_vote.sources;
     const factory = getFactory();

     //add validation so the same member can't vote again
   	 const votesList = publish_vote.news.votes;
   	 for(var i = 0; i < votesList.length; i++){
     	if (voter == votesList[i].voter){
        	throw new Error('This member has already voted for this news!');
        }
     }

     if (publish_vote.event_type == "PUBLISH" && publish_vote.news.published == true){
         throw new Error('News has not been published yet!');
     }

     /*if(voter.rating < 5 && voter.rating > 2){
         if(sources.length < 10){
             throw new Error('Based on your network rating %rating%, you have not provided enough sources to validate your vote');
         }
     }
     if(voter.rating >= 5 && voter.rating < 7){
         if(sources.length < 5){
             throw new Error('Based on your network rating %rating%, you have not provided enough sources to validate your vote')
         }
     }*/

     if(publish_vote.news.validated == true){
       throw new Error('Cant vote on news that has already been validated');
     }

   	//learn how to deal with Enums
     const vote = factory.newConcept('fake.news.biz', 'Vote');
   	 vote.voter = publish_vote.voter;
   	 vote.vote = publish_vote.vote;
     vote.event_type = publish_vote.event_type;
     publish_vote.news.votes.push(vote);
     publish_vote.news.published = true;

     const assetRegistry = await getAssetRegistry('fake.news.biz.News');
     await assetRegistry.update(publish_vote.news);

     var byzantineFraction;
     var byzantineNrOfMembers;
     var result = null;
     const participantRegistry = await getParticipantRegistry('fake.news.biz.Member');
     const membersList = await participantRegistry.getAll();
     const nrOfNewsValidations = publish_vote.news.votes.length;
     //const votesList = publish_vote.news.votes;
     console.log('membersList length ' + membersList.length);
     for(var i = 0; i < votesList.length; i++){
       console.log('vote.event_type: ' + votesList[i].event_type + ', vote.voter.rating: ' + votesList[i].voter.rating);
     	 if(votesList[i].event_type == "PUBLISH"){
          if(votesList[i].voter.rating < 7 && votesList[i].voter.rating >= 0){
              byzantineFraction = 0.6;
          }
          else if(votesList[i].voter.rating < 9 && votesList[i].voter.rating >= 7){
              byzantineFraction = 0.3;
          }
          console.log('Byzantine Fraction' + byzantineFraction);
         	byzantineNrOfMembers = membersList.length * byzantineFraction;
       }
     }
     if(nrOfNewsValidations >= byzantineNrOfMembers){
         console.log('Entrou para verificar consenso');
         console.log('Byzantine Nr of Members: ' + byzantineNrOfMembers);
         var countTrue = 0;
         var countFalse = 0;
         for(var j = 0; j < votesList.length; j++){
           if(votesList[j].vote == true){
              countTrue++;
           } else {
              countFalse++;
           }
           if(countTrue >= byzantineNrOfMembers){
              result = true;
              //updateMembersRating(votesList, result);
              break;
           } else if(countFalse >= byzantineNrOfMembers){
              result = false;
              //updateMembersRating(votesList, result);
              break;
             }
          }
       }

     if(result == true){
        console.log('publishVote true');
        publish_vote.news.validated = true;
        publish_vote.news.validationResult = true;
        await assetRegistry.update(publish_vote.news);
     } else if(result == false){
        console.log('publishVote false');
        publish_vote.news.validated = true;
        publish_vote.news.validationResult = false;
        await assetRegistry.update(publish_vote.news);
     }

     //emit the event about the transaction
 }

 /**
  * FUNCTION WILL BE DISCONTINUED: copy the contents into publish_vote function
  */
async function updateMembersRating(votesList, result){
    //calculate the average rating
    const RATING_UPDATE_VALUE = 0.2;
    const participantRegistry = await getPartcipantRegistry('fake.news.biz.Member');
    for(const vote in votesList){
        if(result == vote.vote){
            vote.voter.rating = vote.voter.rating + RATING_UPDATE_VALUE;
            await participantRegistry.update(vote.voter);
        }
        else {
            vote.voter.rating = vote.voter.rating - RATING_UPDATE_VALUE;
            await participantRegistry.update(vote.voter);
        }
    }

}

 /**
 * Function to allow the participant to create news to be published and validated on the network
 * This function SHOULD be merged with the publish_vote transaction, but how?
 * @param {fake.news.biz.Register_News} register_news - the news to be registered
 * @transaction
*/
async function registerNews(register_news) {
    const factory = getFactory();

    var news = factory.newResource('fake.news.biz', 'News', 'NEWS_1');

    /*
    o Boolean published
    o Boolean validated
    o Boolean validationResult
    --> Member[] validators
    */

    news.title = register_news.title;
    news.text = register_news.text;
    news.published = false;
    news.validated = false;
    news.validationResult = null;
    news.validators = [];

    const newsRegistry = await getAssetRegistry('fake.news.biz.News');
    await newsRegistry.add(news);
}
