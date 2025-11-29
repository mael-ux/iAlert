import React, { useState, useEffect } from 'react';

import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, Modal } from 'react-native';

import { useUser } from '@clerk/clerk-expo';

import { useRouter } from 'expo-router';

import { useTheme } from './ThemeContext';
import * as FileSystem from 'expo-file-system/legacy';


// 1. URLs de las imágenes predefinidas por el desarrollador

// NOTA: Estas URLs DEBEN ser accesibles públicamente.

const PRESET_AVATARS = [

    'https://files.imagetourl.net/uploads/1764209863892-45678c27-1d46-465c-955e-56caff2bd1e3.jpeg',

    'https://files.imagetourl.net/uploads/1764210774058-e43348a8-0769-48f0-b647-66b2dab9ab3a.jpeg',

    'https://files.imagetourl.net/uploads/1764210953668-2ef0d9d5-76b2-4101-bdd3-b859528471ec.jpeg',

    'https://files.imagetourl.net/uploads/1764211008745-bbb865b4-287f-4908-a427-aa8e477fb01f.jpeg',
        
    'https://files.imagetourl.net/uploads/1764211079056-d83ebe48-e600-479b-84d4-963b71d54b54.jpeg'
   // Añade más URLs aquí

];



// --- COMPONENTE MODAL DE SELECCIÓN ---

const AvatarSelectionModal = ({ isVisible, onClose, onSelectAvatar, theme }) => (

    <Modal

        animationType="slide"

        transparent={true}

        visible={isVisible}

        onRequestClose={onClose}

    >

        <View style={styles.centeredView}>

            <View style={[styles.modalView, { backgroundColor: theme.card }]}>

                <Text style={[styles.modalTitle, { color: theme.text }]}>Selecciona un Avatar</Text>

                <ScrollView contentContainerStyle={styles.avatarList}>

                    {PRESET_AVATARS.map((uri, index) => (

                        <TouchableOpacity

                            key={index}

                            style={styles.avatarOption}

                            onPress={() => onSelectAvatar(uri)}

                        >

                            <Image source={{ uri }} style={styles.avatarPreview} />

                        </TouchableOpacity>

                    ))}

                </ScrollView>

                <TouchableOpacity

                    style={[styles.closeButton, { backgroundColor: theme.primary }]}

                    onPress={onClose}

                >

                    <Text style={styles.changePhotoText}>Cerrar</Text>

                </TouchableOpacity>

            </View>

        </View>

    </Modal>

);

// ----------------------------------------





export default function EditUsuarioScreen() {

    const { user, isLoaded } = useUser();

    const router = useRouter();

    const { theme } = useTheme();



    const [firstName, setFirstName] = useState('');

    const [lastName, setLastName] = useState('');

    const [email, setEmail] = useState('');

    const [password, setPassword] = useState('');

    const [tempProfileImageUri, setTempProfileImageUri] = useState(user?.imageUrl);

    // NUEVO ESTADO: controla la visibilidad del modal

    const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);



    useEffect(() => {

        if (isLoaded && user) {

            setFirstName(user.firstName || '');

            setLastName(user.lastName || '');

            setEmail(user.primaryEmailAddress?.emailAddress || '');

            setTempProfileImageUri(user.imageUrl);

        }

    }, [isLoaded, user]);



    // --- NUEVA FUNCIÓN PARA CAMBIAR FOTO DE PERFIL DESDE PRESETS ---
    const handlePresetPhotoChange = async (uri) => {
        setIsSelectionModalVisible(false); // Cierra el modal primero
        if (!user) return;

        // Muestra la imagen seleccionada temporalmente
        setTempProfileImageUri(uri);

        try {
            // 1. Obtener extensión y tipo MIME
            const fileExtension = uri.split('.').pop().split('?')[0] || 'png';
            const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

            // 2. Descargar la imagen al caché del dispositivo
            const localPath = FileSystem.cacheDirectory + `preset_avatar.${fileExtension}`;
            const downloadResult = await FileSystem.downloadAsync(uri, localPath);

            // 3. Leer el archivo descargado como base64
            const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // 4. Construir data URL y enviarla a Clerk
            const dataUrl = `data:${mimeType};base64,${base64}`;
            await user.setProfileImage({ file: dataUrl });

            Alert.alert('Foto actualizada', 'Tu foto de perfil ha sido cambiada exitosamente.');
        } catch (err) {
            console.error('Error subiendo foto de perfil:', err);
            Alert.alert('Error', 'No se pudo subir la foto desde la URL predefinida.');
            // Si falla la subida, revertir a la URL anterior de Clerk
            setTempProfileImageUri(user.imageUrl);
        }
    };





    const handleSave = async () => {

        if (!user) return;



        try {

            await user.update({

                firstName: firstName || undefined,

                lastName: lastName || undefined,

            });



            Alert.alert('Listo', 'Tus datos se han actualizado (nombre / apellido).');

            router.back();

        } catch (err) {

            console.error('Error actualizando usuario', err);

            Alert.alert('Error', err.errors?.[0]?.message || 'No se pudieron actualizar los datos');

        }

    };



    if (!isLoaded) {

        return null;

    }



    return (

        <View style={[styles.container, { backgroundColor: theme.background }] }>

            <ScrollView contentContainerStyle={styles.scroll}>

                <Text style={[styles.title, { color: theme.text }]}>Editar cuenta</Text>



                {/* --- COMPONENTE DE FOTO DE PERFIL --- */}

                <View style={styles.profileContainer}>

                    <Image

                        source={{ uri: tempProfileImageUri }}

                        style={styles.profileImage}

                    />

                    <TouchableOpacity

                        style={[styles.changePhotoButton, { backgroundColor: theme.primary }]}

                        onPress={() => setIsSelectionModalVisible(true)} // Abre el modal

                    >

                        <Text style={[styles.changePhotoText, { color: theme.white }]}>Elegir Avatar</Text>

                    </TouchableOpacity>

                </View>

                {/* ------------------------------------------- */}



                <View style={styles.field}>

                    <Text style={[styles.label, { color: theme.textLight }]}>Nombre</Text>

                    <TextInput

                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}

                        value={firstName}

                        onChangeText={setFirstName}

                        placeholder="Nombre"

                        placeholderTextColor={theme.textLight}

                    />

                </View>

               

                {/* ... (El resto de campos se mantienen) ... */}

               

                <View style={styles.field}>

                    <Text style={[styles.label, { color: theme.textLight }]}>Apellido</Text>

                    <TextInput

                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}

                        value={lastName}

                        onChangeText={setLastName}

                        placeholder="Apellido"

                        placeholderTextColor={theme.textLight}

                    />

                </View>



                <View style={styles.field}>

                    <Text style={[styles.label, { color: theme.textLight }]}>Correo electrónico</Text>

                    <TextInput

                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}

                        value={email}

                        onChangeText={setEmail}

                        placeholder="Correo"

                        placeholderTextColor={theme.textLight}

                        keyboardType="email-address"

                        autoCapitalize="none"

                    />

                </View>



                <View style={styles.field}>

                    <Text style={[styles.label, { color: theme.textLight }]}>Nueva contraseña</Text>

                    <TextInput

                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}

                        value={password}

                        onChangeText={setPassword}

                        placeholder="••••••••"

                        placeholderTextColor={theme.textLight}

                        secureTextEntry

                    />

                </View>



                <TouchableOpacity

                    style={[styles.saveButton, { backgroundColor: theme.primary }]}

                    onPress={handleSave}

                    activeOpacity={0.8}

                >

                    <Text style={[styles.saveText, { color: theme.white }]}>Guardar cambios</Text>

                </TouchableOpacity>

            </ScrollView>



            {/* Renderizar el Modal de Selección */}

            <AvatarSelectionModal

                isVisible={isSelectionModalVisible}

                onClose={() => setIsSelectionModalVisible(false)}

                onSelectAvatar={handlePresetPhotoChange}

                theme={theme}

            />

        </View>

    );

}



const styles = StyleSheet.create({

    container: {

        flex: 1,

    },

    scroll: {

        paddingHorizontal: 20,

        paddingTop: 60,

        paddingBottom: 40,

    },

    title: {

        fontSize: 24,

        fontWeight: '700',

        marginBottom: 24,

    },

    profileContainer: {

        alignItems: 'center',

        marginBottom: 30,

    },

    profileImage: {

        width: 100,

        height: 100,

        borderRadius: 50,

        borderWidth: 2,

        borderColor: '#ccc',

        marginBottom: 10,

    },

    changePhotoButton: {

        padding: 8,

        borderRadius: 8,

    },

    changePhotoText: {

        fontSize: 14,

        fontWeight: '600',

    },

    field: {

        marginBottom: 20,

    },

    label: {

        fontSize: 14,

        marginBottom: 6,

    },

    input: {

        borderWidth: 1,

        borderRadius: 12,

        paddingHorizontal: 14,

        paddingVertical: 12,

        fontSize: 16,

    },

    saveButton: {

        marginTop: 10,

        paddingVertical: 16,

        borderRadius: 12,

        alignItems: 'center',

    },

    saveText: {

        fontSize: 16,

        fontWeight: '600',

    },

    // --- ESTILOS DEL MODAL ---

    centeredView: {

        flex: 1,

        justifyContent: 'center',

        alignItems: 'center',

        backgroundColor: 'rgba(0, 0, 0, 0.5)',

    },

    modalView: {

        margin: 20,

        borderRadius: 20,

        padding: 35,

        alignItems: 'center',

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.25,

        shadowRadius: 4,

        elevation: 5,

        width: '80%',

        maxHeight: '70%',

    },

    modalTitle: {

        fontSize: 18,

        fontWeight: 'bold',

        marginBottom: 15,

    },

    avatarList: {

        flexDirection: 'row',

        flexWrap: 'wrap',

        justifyContent: 'center',

        paddingBottom: 20,

    },

    avatarOption: {

        margin: 10,

        borderWidth: 3,

        borderColor: 'transparent',

        borderRadius: 50,

    },

    avatarPreview: {

        width: 60,

        height: 60,

        borderRadius: 30,

    },

    closeButton: {

        marginTop: 15,

        padding: 10,

        borderRadius: 10,

    },

    // -------------------------

});