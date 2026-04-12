import { type ComponentType, type ReactNode, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import type { LayoutChangeEvent } from 'react-native';
import { NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/ui/Screen';
import { useEntriesQuery } from '../../entries/hooks/useEntriesQuery';

type MapboxModule = {
	default: {
		setAccessToken: (token: string) => void;
		MapView: ComponentType<{ style: unknown; styleURL: string; children?: ReactNode }>;
		Camera: ComponentType<{ centerCoordinate: [number, number]; zoomLevel: number }>;
		MarkerView: ComponentType<{ id: string; coordinate: [number, number]; children?: ReactNode }>;
	};
};

function getMapboxModule(): MapboxModule | null {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require('@rnmapbox/maps');
	} catch {
		return null;
	}
}

function hasMapboxNativeModule() {
	const modules = NativeModules as Record<string, unknown>;
	return Boolean(modules.RNMBXModule || modules.RNMBXMapsModule || modules.MGLModule);
}

export function HomeMapScreen() {
	const mapboxModule = useMemo(() => getMapboxModule(), []);
	const nativeMapboxAvailable = useMemo(() => hasMapboxNativeModule(), []);
	const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
	const isExpoGo = Constants.appOwnership === 'expo';
	const mapboxUnavailableReason = useMemo(() => {
		if (isExpoGo) {
			return 'Mapbox cannot run in Expo Go. Use an Expo development build to enable native Mapbox.';
		}

		if (!mapboxModule) {
			return 'Mapbox package was not found in this build.';
		}

		if (!nativeMapboxAvailable) {
			return 'Mapbox native module is missing. Rebuild the app after installing @rnmapbox/maps.';
		}

		if (!accessToken) {
			return 'Mapbox needs EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to render.';
		}

		try {
			mapboxModule.default.setAccessToken(accessToken);
			void mapboxModule.default.MapView;
			void mapboxModule.default.Camera;
			return null;
		} catch {
			return 'Mapbox native code is not linked in this client. Rebuild your development app.';
		}
	}, [accessToken, isExpoGo, mapboxModule, nativeMapboxAvailable]);
	const { data = [], isLoading, isError } = useEntriesQuery();
	const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [hasValidMapLayout, setHasValidMapLayout] = useState(false);

	const handleMapLayout = (event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout;
		setHasValidMapLayout(width > 0 && height > 0);
	};

	useEffect(() => {
		let active = true;

		async function loadCurrentLocation() {
			try {
				const permission = await Location.requestForegroundPermissionsAsync();
				if (!active) {
					return;
				}

				if (permission.status !== 'granted') {
					setLocationError('Location permission is required to center the map.');
					return;
				}

				const current = await Location.getCurrentPositionAsync({
					accuracy: Location.Accuracy.Balanced,
				});

				if (!active) {
					return;
				}

				setUserLocation([current.coords.longitude, current.coords.latitude]);
				setLocationError(null);
			} catch {
				if (!active) {
					return;
				}

				setLocationError('Could not read your current location.');
			}
		}

		void loadCurrentLocation();

		return () => {
			active = false;
		};
	}, []);

	if (mapboxUnavailableReason) {
		return (
			<Screen>
				<View style={styles.fallbackContainer}>
					<Text style={styles.title}>Map</Text>
					<Text style={styles.fallbackText}>{mapboxUnavailableReason}</Text>
					<Text style={styles.fallbackHint}>You can keep using the rest of the app while this is fixed.</Text>
				</View>
			</Screen>
		);
	}

	const Mapbox = mapboxModule!.default;

	return (
		<Screen>
			<View style={styles.container}>
				<View style={styles.mapFrame} onLayout={handleMapLayout}>
					{hasValidMapLayout ? (
						<Mapbox.MapView style={styles.map} styleURL="mapbox://styles/mapbox/streets-v12">
						{userLocation ? <Mapbox.Camera centerCoordinate={userLocation} zoomLevel={15} /> : null}

						{data
							.filter((entry) => entry.latitude != null && entry.longitude != null)
							.map((entry) => (
								<Mapbox.MarkerView
									key={entry.id}
									id={entry.id}
									coordinate={[entry.longitude as number, entry.latitude as number]}
								>
									<View style={styles.marker}>
										<Text style={styles.markerText}>🐾</Text>
									</View>
								</Mapbox.MarkerView>
							))}

						{userLocation ? (
							<Mapbox.MarkerView id="user-location" coordinate={userLocation}>
								<View style={styles.userMarkerOuter}>
									<View style={styles.userMarkerInner} />
								</View>
							</Mapbox.MarkerView>
						) : null}
						</Mapbox.MapView>
					) : (
						<View style={styles.mapLoadingState}>
							<Text style={styles.statusText}>Preparing map...</Text>
						</View>
					)}

					<View style={styles.statusOverlay} pointerEvents="none">
						{isLoading ? <Text style={styles.statusText}>Loading sightings...</Text> : null}
						{isError ? <Text style={styles.statusErrorText}>Could not load latest sightings.</Text> : null}
						{locationError ? <Text style={styles.statusErrorText}>{locationError}</Text> : null}
						{!locationError && !userLocation ? <Text style={styles.statusText}>Locating you...</Text> : null}
					</View>

					<View style={styles.recenterOverlay} pointerEvents="box-none">
						<Pressable
							style={[styles.recenterButton, !userLocation ? styles.recenterButtonDisabled : null]}
							disabled={!userLocation}
							onPress={() => {
								void (async () => {
									try {
										const current = await Location.getCurrentPositionAsync({
											accuracy: Location.Accuracy.Balanced,
										});
										setUserLocation([current.coords.longitude, current.coords.latitude]);
										setLocationError(null);
									} catch {
										setLocationError('Could not recenter to your current location.');
									}
								})();
							}}
						>
							<Text style={styles.recenterButtonText}>Recenter</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Screen>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000',
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#0F172A',
	},
	mapFrame: {
		flex: 1,
	},
	map: {
		flex: 1,
	},
	statusOverlay: {
		position: 'absolute',
		left: 12,
		right: 84,
		top: 12,
		gap: 8,
	},
	recenterOverlay: {
		position: 'absolute',
		right: 12,
		bottom: 24,
	},
	mapLoadingState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0F172A',
	},
	marker: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: '#0EA5E9',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#FFFFFF',
	},
	markerText: {
		fontSize: 14,
	},
	recenterButton: {
		height: 48,
		paddingHorizontal: 16,
		borderRadius: 999,
		backgroundColor: 'rgba(15, 23, 42, 0.78)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	recenterButtonDisabled: {
		opacity: 0.5,
	},
	recenterButtonText: {
		fontWeight: '700',
		color: '#FFFFFF',
	},
	userMarkerOuter: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: 'rgba(14, 165, 233, 0.3)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	userMarkerInner: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#0284C7',
		borderWidth: 1,
		borderColor: '#FFFFFF',
	},
	fallbackContainer: {
		flex: 1,
		padding: 16,
		justifyContent: 'center',
		gap: 10,
	},
	fallbackText: {
		color: '#334155',
		lineHeight: 22,
	},
	fallbackHint: {
		color: '#0EA5E9',
	},
	statusText: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '600',
		textShadowColor: 'rgba(0, 0, 0, 0.35)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	statusErrorText: {
		color: '#FCA5A5',
		fontSize: 13,
		fontWeight: '600',
		textShadowColor: 'rgba(0, 0, 0, 0.35)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
});
