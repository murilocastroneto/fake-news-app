/**
 * Publish and/or vote news on the network
 * @param {fake.news.biz.PublishNews} publish - the publishment/vote to be processed
 * @transaction
*/
 async function publish(publish){
     const publisher = getCurrentParticipant();
     console.log('Verify resource type: '+publisher.getType());
     //add error handling for this method

     const factory = getFactory();
     const news = factory.newResource('fake.news.biz', 'News', publish.news_id);

     news.title = publish.news_title;
     news.desc = publish.news_desc;
     //news.sources = publish.news_sources; //comentei pq estava dando erro no sources
     news.url = publish.news_url;
     news.validated = false;

     const vote = factory.newConcept('fake.news.biz', 'Vote');
     vote.voter = publisher;
     vote.vote = publish.vote;
     vote.publishment = true;

     news.votes = [];
     news.votes.push(vote);
   
   	 if(publisher.rating >= 10){ 				//se o rate do cara for 10 
     	news.validated = true;   				//notícia já é validada (aceita)
        news.validationResult = publish.vote;	//com o voto do cara
     }

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

    const voter = getCurrentParticipant();
    console.log('Verify resource type: '+voter.getType());

    const factory = getFactory();

    if(voteNews.news.validated == true){
      throw new Error('Cant vote on news that has already been validated');
    }

    const votesListPreVote = voteNews.news.votes;
    for(var f = 0; f < votesListPreVote.length; f++){
     	if (voter == votesListPreVote[f].voter){
        	throw new Error('This member has already voted for this news!');
        }
    }

    const vote = factory.newConcept('fake.news.biz', 'Vote');
    vote.voter = voter;
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
         else if(votesList[i].voter.rating < 10 && votesList[i].voter.rating >= 7){
             byzantineFraction = 0.3;
         }
         //console.log('Byzantine Fraction' + byzantineFraction);
         var activeMembersCount = 0;				  //contador de membros não banidos
         for(var m = 0; m < membersList.length; m++){ //percorre lista de membros
         	if(!membersList[m].banned){				  //se o peer não está banido
            	activeMembersCount++;			      //conta ele
            }           
         }        
         byzantineNrOfMembers = activeMembersCount * byzantineFraction; //mudei de 'membersList.length' para 'activeMembersCount'
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
             console.log('Entrou no false '+j);
             break;
          } else if(nrOfNewsValidations == byzantineNrOfMembers && result == null) { //se número de membros necessário ja votou e não houve consenso
         		if (votesList[0].voter.rating > 7){
                	result = true;    
                  	break;
                } else {
                	result = false;
                 	break;
                }                    	
          }
          
         }//for

      }

    if(result != null){
      var updateFactorNumber = (membersList.length - nrOfNewsValidations) * 0.01;
      for(var k = 0; k < nrOfNewsValidations; k++){
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
