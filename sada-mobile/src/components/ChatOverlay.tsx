import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../theme';
import { SocketService } from '../services/SocketService';

interface ChatMessage {
    id: string;
    sender: {
        display_name: string;
    };
    content: string;
}

export const ChatOverlay = ({ roomId }: { roomId: string }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const listRef = useRef<FlatList>(null);

    useEffect(() => {
        SocketService.onMessage((msg) => {
            setMessages((prev) => [...prev, msg]);
            setTimeout(() => listRef.current?.scrollToEnd(), 100);
        });

        return () => {
            SocketService.offMessage();
        };
    }, []);

    const handleSend = () => {
        if (!input.trim()) return;
        SocketService.sendMessage(roomId, input);
        setInput('');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <View style={styles.messagesContainer}>
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.messageRow}>
                            <Text style={styles.sender}>{item.sender.display_name}: </Text>
                            <Text style={styles.content}>{item.content}</Text>
                        </View>
                    )}
                    inverted={false}
                />
            </View>

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Say something..."
                    placeholderTextColor={theme.colors.textSecondary}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    messagesContainer: {
        maxHeight: 200, // Limit height so it doesn't cover speakers
        paddingHorizontal: theme.spacing.m,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.xs,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    sender: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        color: '#fff',
        fontSize: 14,
    },
    inputRow: {
        flexDirection: 'row',
        padding: theme.spacing.m,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    input: {
        flex: 1,
        backgroundColor: theme.colors.background,
        color: '#fff',
        borderRadius: 20,
        paddingHorizontal: theme.spacing.m,
        height: 40,
        marginRight: theme.spacing.m,
    },
    sendButton: {
        justifyContent: 'center',
    },
    sendText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
});
