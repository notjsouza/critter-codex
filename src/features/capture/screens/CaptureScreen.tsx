import { zodResolver } from '@hookform/resolvers/zod';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { Screen } from '../../../components/ui/Screen';
import {
  CreateEntryWithImageError,
  useCreateEntryWithImageMutation,
} from '../../entries/hooks/useCreateEntryWithImageMutation';

const createEntrySchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  description: z.string().trim().optional(),
});

type CreateEntryForm = z.infer<typeof createEntrySchema>;

type Coordinates = {
  latitude: number;
  longitude: number;
};

export function CaptureScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const createMutation = useCreateEntryWithImageMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEntryForm>({
    resolver: zodResolver(createEntrySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Camera permission needed', 'Enable camera permission to capture a pet photo.');
        return;
      }
    }

    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef) {
      return;
    }

    const photo = await cameraRef.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setShowCamera(false);
    }
  };

  const useCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission denied', 'Entry will be created without coordinates.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } finally {
      setLoadingLocation(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!photoUri) {
      Alert.alert('Photo required', 'Capture a photo before creating an entry.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        imageUri: photoUri,
        name: values.name,
        description: values.description?.trim() || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      reset();
      setPhotoUri(null);
      setLocation(null);

      Alert.alert('Entry created', 'Your sighting with photo was saved.');
    } catch (error) {
      if (error instanceof CreateEntryWithImageError) {
        if (error.code === 'upload_failed') {
          Alert.alert('Upload failed', 'Image upload failed. Please retry.');
          return;
        }

        if (error.code === 'create_failed_cleanup_succeeded') {
          Alert.alert('Save failed', 'Entry save failed after upload, but uploaded image was cleaned up safely.');
          return;
        }

        Alert.alert(
          'Save failed',
          'Entry save failed after upload and automatic cleanup also failed. Please retry and check storage logs.'
        );
        return;
      }

      Alert.alert('Create failed', 'Could not create entry. Please try again.');
    }
  });

  if (showCamera) {
    return (
      <Screen>
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} facing="back" ref={setCameraRef} />
          <View style={styles.cameraActions}>
            <Pressable style={styles.secondaryButton} onPress={() => setShowCamera(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => void capturePhoto()}>
              <Text style={styles.primaryButtonText}>Use Photo</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={styles.title}>Capture Sighting</Text>
        <Text style={styles.subtitle}>Take a photo, fill details, and create a new campus pet entry.</Text>

        {photoUri ? (
          <View style={styles.photoCard}>
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
            <Pressable style={styles.secondaryButton} onPress={() => void openCamera()}>
              <Text style={styles.secondaryButtonText}>Retake Photo</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.primaryButton} onPress={() => void openCamera()}>
            <Text style={styles.primaryButtonText}>Open Camera</Text>
          </Pressable>
        )}

        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Orange tabby near library"
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name.message}</Text> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { value, onChange, onBlur } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Friendly and playful with blue harness"
                multiline
                numberOfLines={4}
              />
            </View>
          )}
        />

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            void useCurrentLocation();
          }}
        >
          <Text style={styles.secondaryButtonText}>
            {loadingLocation ? 'Getting location...' : 'Use Current Location'}
          </Text>
        </Pressable>

        {location ? (
          <Text style={styles.locationText}>
            Location set: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        ) : null}

        <Pressable
          style={[styles.primaryButton, createMutation.isPending && styles.disabledButton]}
          onPress={() => {
            void onSubmit();
          }}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Entry</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    color: '#334155',
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
  },
  photoCard: {
    gap: 8,
  },
  preview: {
    height: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  locationText: {
    color: '#334155',
  },
  cameraContainer: {
    flex: 1,
    gap: 12,
    padding: 16,
  },
  camera: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cameraActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
});
