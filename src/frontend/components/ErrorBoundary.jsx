import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../theme/Theme';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Oops! Something went wrong.</Text>
                    <Text style={styles.subtitle}>We're sorry for the inconvenience.</Text>

                    <ScrollView style={styles.errorContainer}>
                        <Text style={styles.errorText}>
                            {this.state.error && this.state.error.toString()}
                        </Text>
                    </ScrollView>

                    <TouchableOpacity style={styles.resetButton} onPress={this.handleReset}>
                        <Text style={styles.resetButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F7F8FA',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#DC2626',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 24,
    },
    errorContainer: {
        maxHeight: 200,
        width: '100%',
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        marginBottom: 24,
    },
    errorText: {
        color: '#991B1B',
        fontSize: 12,
        fontFamily: 'monospace',
    },
    resetButton: {
        backgroundColor: Colors.agriGreen,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    resetButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default ErrorBoundary;
