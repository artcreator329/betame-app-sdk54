#!/usr/bin/env node

/**
 * Test script to reproduce the service offer notification issue
 * Creates a test offer and monitors the notification flow
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('🧪 Testing service offer notification flow...');
    console.log('=======================================================');

    try {
        // 1. Get test users and service
        console.log('\n📋 1. Setting up test data...');

        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .limit(2);

        if (usersError || users.length < 2) {
            console.error('❌ Need at least 2 users for testing');
            return;
        }

        const serviceProvider = users[0];
        const buyer = users[1];

        console.log(`👤 Service Provider: ${serviceProvider.full_name} (${serviceProvider.id})`);
        console.log(`👤 Buyer: ${buyer.full_name} (${buyer.id})`);

        // Get a test service
        const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('*')
            .eq('user_id', serviceProvider.id)
            .limit(1);

        if (servicesError || services.length === 0) {
            console.error('❌ No services found for service provider');
            return;
        }

        const testService = services[0];
        console.log(`🛠️ Test Service: ${testService.title} (${testService.id})`);

        // 2. Create or get a chat between the users
        console.log('\n💬 2. Setting up chat...');

        let chatId;
        const { data: existingChat } = await supabase
            .from('chats')
            .select('id')
            .or(`and(participant1_id.eq.${serviceProvider.id},participant2_id.eq.${buyer.id}),and(participant1_id.eq.${buyer.id},participant2_id.eq.${serviceProvider.id})`)
            .limit(1);

        if (existingChat && existingChat.length > 0) {
            chatId = existingChat[0].id;
            console.log(`✅ Using existing chat: ${chatId}`);
        } else {
            // Create new chat
            const { data: newChat, error: chatError } = await supabase
                .from('chats')
                .insert({
                    participant1_id: serviceProvider.id,
                    participant2_id: buyer.id,
                    last_message_at: new Date().toISOString()
                })
                .select()
                .single();

            if (chatError) {
                console.error('❌ Error creating chat:', chatError);
                return;
            }

            chatId = newChat.id;
            console.log(`✅ Created new chat: ${chatId}`);

            // Create chat participants
            await supabase.from('chat_participants').insert([
                { chat_id: chatId, user_id: serviceProvider.id },
                { chat_id: chatId, user_id: buyer.id }
            ]);
        }

        // 3. Clear existing notifications for clean test
        console.log('\n🧹 3. Clearing existing test notifications...');
        await supabase
            .from('notifications')
            .delete()
            .in('user_id', [serviceProvider.id, buyer.id])
            .eq('type', 'offer');

        // 4. Create service offer using the same logic as the app
        console.log('\n🎯 4. Creating service offer...');

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const offerData = {
            chat_id: chatId,
            service_id: testService.id,
            service_provider_id: serviceProvider.id,
            seller_id: serviceProvider.id, // Keep for backward compatibility
            buyer_id: buyer.id,
            original_price: testService.price,
            custom_price: testService.price,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
        };

        console.log('📤 Creating service offer with data:', offerData);

        const { data: createdOffer, error: offerError } = await supabase
            .from('service_offers')
            .insert(offerData)
            .select()
            .single();

        if (offerError) {
            console.error('❌ Error creating service offer:', offerError);
            return;
        }

        console.log('✅ Service offer created:', createdOffer.id);

        // 5. Create chat message for the offer
        console.log('\n💬 5. Creating chat message...');

        const messageData = {
            chat_id: chatId,
            sender_id: serviceProvider.id,
            sender_name: serviceProvider.full_name,
            sender_image: null,
            message: `Shared a service: ${testService.title}`,
            message_type: 'offer',
            offer_id: createdOffer.id,
            offer_status: 'pending',
            offer_expires_at: expiresAt.toISOString(),
            custom_price: testService.price,
            is_hidden: false,
            moderation_reason: null,
            is_reported: false,
        };

        const { data: createdMessage, error: messageError } = await supabase
            .from('chat_messages')
            .insert(messageData)
            .select()
            .single();

        if (messageError) {
            console.error('❌ Error creating chat message:', messageError);
            return;
        }

        console.log('✅ Chat message created:', createdMessage.id);

        // 6. Manually create notification using the same logic as the app
        console.log('\n🔔 6. Creating notification manually...');

        // Test the notification service logic
        const notificationResult = await supabase.rpc('create_notification', {
            p_user_id: buyer.id,
            p_type: 'offer',
            p_title: `New offer from ${serviceProvider.full_name}`,
            p_message: `${testService.title} - ${testService.currency} ${testService.price}`,
            p_data: {
                chatId: chatId,
                participantId: serviceProvider.id,
                participantName: serviceProvider.full_name,
                participantImage: null,
                offerId: createdOffer.id,
                offerStatus: 'pending',
                serviceTitle: testService.title,
                price: testService.price,
                currency: testService.currency,
            },
            p_id: `offer_${createdOffer.id}_${Date.now()}`
        });

        if (notificationResult.error) {
            console.error('❌ Error creating notification:', notificationResult.error);
        } else {
            console.log('✅ Notification created successfully');
        }

        // 7. Wait a moment and check notifications
        console.log('\n⏳ 7. Waiting 2 seconds for processing...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 8. Check notifications for both users
        console.log('\n📊 8. Checking notifications...');

        const { data: providerNotifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', serviceProvider.id)
            .eq('type', 'offer')
            .gte('created_at', new Date(Date.now() - 60000).toISOString());

        const { data: buyerNotifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', buyer.id)
            .eq('type', 'offer')
            .gte('created_at', new Date(Date.now() - 60000).toISOString());

        console.log(`📱 Service Provider notifications: ${providerNotifications?.length || 0}`);
        providerNotifications?.forEach(notif => {
            console.log(`  - ${notif.title}: ${notif.message}`);
        });

        console.log(`🛒 Buyer notifications: ${buyerNotifications?.length || 0}`);
        buyerNotifications?.forEach(notif => {
            console.log(`  - ${notif.title}: ${notif.message}`);
        });

        // 9. Test the actual notification service method
        console.log('\n🧪 9. Testing NotificationService.addOfferNotification logic...');

        // Simulate the exact logic from the notification service
        const testNotificationData = {
            id: `offer_test_${Date.now()}`,
            user_id: buyer.id,
            type: 'offer',
            title: `New offer from ${serviceProvider.full_name}`,
            message: `${testService.title} - ${testService.currency} ${testService.price}`,
            data: {
                chatId: chatId,
                participantId: serviceProvider.id,
                participantName: serviceProvider.full_name,
                participantImage: null,
                offerId: createdOffer.id,
                offerStatus: 'pending',
                serviceTitle: testService.title,
                price: testService.price,
                currency: testService.currency,
                senderId: serviceProvider.id,
                isIncoming: true,
            },
            is_read: false,
            created_at: new Date().toISOString()
        };

        console.log('📤 Testing direct notification insert...');
        const { data: directNotification, error: directError } = await supabase
            .from('notifications')
            .insert(testNotificationData)
            .select()
            .single();

        if (directError) {
            console.error('❌ Direct notification insert failed:', directError);
        } else {
            console.log('✅ Direct notification insert successful:', directNotification.id);
        }

        // 10. Final check
        console.log('\n📊 10. Final notification count...');

        const { data: finalBuyerNotifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', buyer.id)
            .eq('type', 'offer')
            .gte('created_at', new Date(Date.now() - 60000).toISOString());

        console.log(`🛒 Final buyer notifications: ${finalBuyerNotifications?.length || 0}`);
        finalBuyerNotifications?.forEach(notif => {
            console.log(`  - ${notif.id}: ${notif.title}`);
        });

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await supabase.from('notifications').delete().like('id', 'offer_test_%');
        await supabase.from('chat_messages').delete().eq('id', createdMessage.id);
        await supabase.from('service_offers').delete().eq('id', createdOffer.id);

        console.log('✅ Test completed');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

main().catch(console.error);