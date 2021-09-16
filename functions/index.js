const functions = require("firebase-functions");
const admin = require('firebase-admin');
const { firestore } = require("firebase-admin");
var serviceAccount = require("./bulovva-7fdb8-firebase-adminsdk-o4lrw-6ee1829186.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

exports.campaignStartHttp = functions.https.onRequest(async (req, res) => {
    await db.collection('stores').get().then((value) => {
        value.docs.forEach(async (doc) => {
            var query = db.collection('stores/' + doc.id + '/campaigns')
            query = query.where('automatedStart', '==', false)
            query = query.where('campaignStart', '<=', firestore.Timestamp.now())
            query = query.where('campaignStatus', '==', 'wait')
            await query.get().then((valueCamp) => {
                valueCamp.docs.forEach(async (campaign) => {
                    await db.doc('stores/' + doc.id + '/campaigns/' + campaign.id).update('campaignStatus', 'active', 'automatedStart', true);
                    await db.doc('markers/' + doc.id).update('campaignStatus', 'active');
                    await db.doc('tokens/' + doc.id).get().then(async (token) => {
                        await admin.messaging().sendToDevice(token.data().tokenId, {
                            notification: {
                                title: "Kampanyanız başlıyor !",
                                body: 'Hazır olun çünkü kampanyanız başlıyor !',
                                sound: 'bulb.mp3'
                            }
                        })
                    })
                })
            })
        })
    });
    res.send('Başarılı !');
})

exports.campaignStopHttp = functions.https.onRequest(async (req, res) => {
    await db.collection('stores').get().then((value) => {
        value.docs.forEach(async (doc) => {
            var query = db.collection('stores/' + doc.id + '/campaigns')
            query = query.where('automatedStop', '==', false)
            query = query.where('campaignFinish', '<=', firestore.Timestamp.now())
            query = query.where('campaignStatus', '==', 'active')
            await query.get().then((valueCamp) => {
                valueCamp.docs.forEach(async (campaign) => {
                    await db.doc('stores/' + doc.id + '/campaigns/' + campaign.id).update('campaignStatus', 'inactive', 'automatedStop', true);
                    await db.doc('markers/' + doc.id).update('campaignStatus', 'inactive');
                    await db.doc('tokens/' + doc.id).get().then(async (token) => {
                        await admin.messaging().sendToDevice(token.data().tokenId, {
                            notification: {
                                title: "Kampanyanız sona erdi !",
                                body: 'Haydi durmayın tekrar kampanya yayınlamanın tam zamanı!',
                                sound: 'bulb.mp3'
                            }
                        })
                    })
                })
            })
        })
    });
    res.send('Başarılı !');
});

exports.campaignStartJob = functions.pubsub.schedule('* * * * *').onRun(async (context) => {
    await db.collection('stores').get().then((value) => {
        value.docs.forEach(async (doc) => {
            var query = db.collection('stores/' + doc.id + '/campaigns')
            query = query.where('automatedStart', '==', false)
            query = query.where('campaignStart', '<=', firestore.Timestamp.now())
            query = query.where('campaignStatus', '==', 'wait')
            await query.get().then((valueCamp) => {
                valueCamp.docs.forEach(async (campaign) => {
                    await db.doc('stores/' + doc.id + '/campaigns/' + campaign.id).update('campaignStatus', 'active', 'automatedStart', true);
                    await db.doc('markers/' + doc.id).update('campaignStatus', 'active');
                    await db.doc('tokens/' + doc.id).get().then(async (token) => {
                        await admin.messaging().sendToDevice(token.data().tokenId, {
                            notification: {
                                title: "Kampanyanız başlıyor !",
                                body: 'Hazır olun çünkü kampanyanız başlıyor !',
                                sound: 'bulb.mp3'
                            }
                        })
                    })
                })
            })
        })
    });
})

exports.campaignStopJob = functions.pubsub.schedule('* * * * *').onRun(async (context) => {
    await db.collection('stores').get().then((value) => {
        value.docs.forEach(async (doc) => {
            var query = db.collection('stores/' + doc.id + '/campaigns')
            query = query.where('automatedStop', '==', false)
            query = query.where('campaignFinish', '<=', firestore.Timestamp.now())
            query = query.where('campaignStatus', '==', 'active')
            await query.get().then((valueCamp) => {
                valueCamp.docs.forEach(async (campaign) => {
                    await db.doc('stores/' + doc.id + '/campaigns/' + campaign.id).update('campaignStatus', 'inactive', 'automatedStop', true);
                    await db.doc('markers/' + doc.id).update('campaignStatus', 'inactive');
                    await db.doc('tokens/' + doc.id).get().then(async (token) => {
                        await admin.messaging().sendToDevice(token.data().tokenId, {
                            notification: {
                                title: "Kampanyanız sona erdi !",
                                body: 'Haydi durmayın tekrar kampanya yayınlamanın tam zamanı !',
                                sound: 'bulb.mp3'
                            }
                        })
                    })
                })
            })
        })
    });
})

exports.commentCreate = functions.firestore.document('wishes/{wishId}').onCreate(async (snapshot, context) => {
    const { wishId } = context.params;

    var wish = await db.doc('wishes/' + wishId).get()

    await db.doc('users/' + wish.data().wishStore).get().then(async (user) => {
        await admin.messaging().sendToDevice(user.data().token, {
            notification: {
                title: "Yeni Dilek & Şikayet Geldi !",
                body: "Müşterilerinizden gelen dilek ve şikayetler, işletmeniz için çok önemlidir.",
                sound: "bulb.mp3"
            }
        })
    })
});

exports.campaignCreate = functions.firestore.document('stores/{storeId}/campaigns/{campaignId}').onCreate(async (snapshot, context) => {
    const { storeId } = context.params;
    const store = await db.doc('stores/' + storeId).get()

    await db.collection('users').where('favorites', "array-contains", storeId).get().then(async (users) => {
        users.forEach(async (user) => {
            await admin.messaging().sendToDevice(user.data().token, {
                notification: {
                    title: 'Yeni Kampanya Yayınlandı !',
                    body: "Favori mekanlarınızdan " + store.data().storeName + ' yeni bir kampanya yayınladı bakmayı unutmayın !',
                    sound: 'bulb.mp3'
                }
            });
        })
    })
});

exports.reservationCreate = functions.firestore.document('reservations/{reservationId}').onCreate(async (snapshot, context) => {
    const { reservationId } = context.params;

    var reservation = await db.doc('reservations/' + reservationId).get()

    await db.doc('users/' + reservation.data().reservationStore).get().then(async (user) => {
        await admin.messaging().sendToDevice(user.data().token, {
            notification: {
                title: "Yeni Rezervasyon Talebi Geldi !",
                body: 'Yeni gelen bu rezervasyon talebini onaylamalı veya reddetmelisiniz !',
                sound: 'bulb.mp3'
            }
        })
    })
});

exports.reservationUpdate = functions.firestore.document('reservations/{reservationId}').onUpdate(async (snapshot, context) => {
    const { reservationId } = context.params;
    var userId = undefined
    var title = undefined
    var body = undefined

    var reservation = await db.doc('reservations/' + reservationId).get()

    if (reservation.data().reservationStatus == 'canceled') {
        userId = reservation.data().reservationStore
        title = 'Bir rezervasyon iptal edildi !'
        body = reservation.data().reservationName + ' isimli müşteriniz rezervasyonunu iptal etmiştir !'
    }
    else if (reservation.data().reservationStatus == 'approved') {
        userId = reservation.data().reservationStore
        title = 'Rezervasyonunuz onaylandı !'
        body = reservation.data().reservationStoreName + ' işletmesine ait rezervasyonunuz onaylanmıştır !'
    }
    else if (reservation.data().reservationStatus == 'rejected') {
        userId = reservation.data().reservationStore
        title = 'Rezervasyonunuz reddedildi !'
        body = reservation.data().reservationStoreName + ' işletmesine ait rezervasyonunuz iptal edilmiştir !'
    }

    await db.doc('users/' + userId).get().then(async (user) => {
        await admin.messaging().sendToDevice(user.data().token, {
            notification: {
                title: title,
                body: body,
                sound: 'bulb.mp3'
            }
        })
    })
});