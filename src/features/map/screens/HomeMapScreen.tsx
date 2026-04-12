import { type ComponentType, type ReactNode, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import type { LayoutChangeEvent } from 'react-native';
import { NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../../components/ui/Screen';
import type { Entry } from '../../../types/entry';
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
	const [isLocatingUser, setIsLocatingUser] = useState(true);
	const [hasValidMapLayout, setHasValidMapLayout] = useState(false);
	const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

	const handleMapLayout = (event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout;
		setHasValidMapLayout(width > 0 && height > 0);
	};

	const requestAndSetCurrentLocation = async () => {
		setIsLocatingUser(true);
		try {
			const permission = await Location.requestForegroundPermissionsAsync();
			if (permission.status !== 'granted') {
				setLocationError('Location permission is required to center the map.');
				setUserLocation(null);
				return;
			}

			const current = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});

			setUserLocation([current.coords.longitude, current.coords.latitude]);
			setLocationError(null);
		} catch {
			setLocationError('Could not read your current location.');
			setUserLocation(null);
		} finally {
			setIsLocatingUser(false);
		}
	};

	useEffect(() => {
		let active = true;

		void (async () => {
			await requestAndSetCurrentLocation();
			if (!active) {
				return;
			}
		})();

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
					{hasValidMapLayout && userLocation ? (
						<Mapbox.MapView style={styles.map} styleURL="mapbox://styles/mapbox/streets-v12">
							<Mapbox.Camera centerCoordinate={userLocation} zoomLevel={15} />
							{userLocation ? <Mapbox.Camera centerCoordinate={userLocation} zoomLevel={15} /> : null}

							{data
								.filter((entry) => entry.latitude != null && entry.longitude != null)
								.map((entry) => (
									<Mapbox.MarkerView
										key={entry.id}
										id={entry.id}
										coordinate={[entry.longitude as number, entry.latitude as number]}
									>
										<Pressable
											onPress={() => {
												setSelectedEntry(entry);
											}}
										>
											<View style={styles.marker}>
												<Text style={styles.markerText}>🐾</Text>
											</View>
										</Pressable>
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
							{locationError ? <Text style={styles.statusErrorText}>{locationError}</Text> : null}
							{locationError ? (
								<Pressable
									style={styles.retryLocationButton}
									onPress={() => {
										void requestAndSetCurrentLocation();
									}}
								>
									<Text style={styles.retryLocationButtonText}>Try again</Text>
								</Pressable>
							) : null}
						</View>
					)}

					<View style={styles.statusOverlay} pointerEvents="none">
						{isLoading ? <Text style={styles.statusText}>Loading sightings...</Text> : null}
						{isError ? <Text style={styles.statusErrorText}>Could not load latest sightings.</Text> : null}
						{isLocatingUser ? <Text style={styles.statusText}>Locating you...</Text> : null}
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

					{selectedEntry ? (
						<View style={styles.detailOverlay}>
							<View style={styles.detailCard}>
								<Text style={styles.detailTitle}>{selectedEntry.name}</Text>
								{selectedEntry.description ? (
									<Text style={styles.detailDescription}>{selectedEntry.description}</Text>
								) : (
									<Text style={styles.detailDescription}>No description provided.</Text>
								)}
								<Pressable
									style={styles.detailCloseButton}
									onPress={() => {
										setSelectedEntry(null);
									}}
								>
									<Text style={styles.detailCloseButtonText}>Close</Text>
								</Pressable>
							</View>
						</View>
					) : null}
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
	detailOverlay: {
		position: 'absolute',
		left: 12,
		right: 12,
		bottom: 84,
	},
	detailCard: {
		borderRadius: 12,
		backgroundColor: 'rgba(15, 23, 42, 0.92)',
		padding: 12,
		gap: 8,
	},
	detailTitle: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
	detailDescription: {
		color: '#E2E8F0',
		lineHeight: 20,
	},
	detailCloseButton: {
		alignSelf: 'flex-start',
		height: 34,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: '#0EA5E9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	detailCloseButtonText: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	mapLoadingState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		backgroundColor: '#0F172A',
	},
	retryLocationButton: {
		height: 38,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: '#0EA5E9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	retryLocationButtonText: {
		color: '#FFFFFF',
		fontWeight: '700',
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
