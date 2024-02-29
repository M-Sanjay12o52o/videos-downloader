import { h, render } from 'preact';
import { StateUpdater, useEffect, useState } from 'preact/hooks';
import { VideoItem, Message, ReceiveTwitterVideosPayload, ReceiveErrorMessagePayload, ReceiveInfoMessagePayload, RequestTwitterVideosPayload, CompleteTwitterEnvironmentSetupPayload } from '../abi';
import './popup.css';
import axios from 'axios';

render(<App />, document.getElementById('root'));

function App(props: any) {
	const [videoList, updateVideoList]: [VideoItem[], StateUpdater<VideoItem[]>] = useState([]);
	const [errorMessage, updateErrorMessage]: [string | null, StateUpdater<string | null>] = useState(null);
	const [infoMessage, updateInfoMessage]: [string | null, StateUpdater<string | null>] = useState(null);
	const [youtubevideoList, updateYoutubeVideoList]: any = useState(null);
	const [window, updateWindow]: [string | null, StateUpdater<string | null>] = useState(null);
	const [urlValue, updateUrlValue]: [string | null, StateUpdater<string | null>] = useState(null);

	useEffect(() => {
		chrome.tabs.query({ active: true }, (tabs) => {
			const url = tabs[0]?.url || null;
			updateUrlValue(url);
			const windowType = getWindowType(url);

			updateWindow(windowType);
		});
	}, [])

	useEffect(() => {
		return appMessaging(urlValue, updateYoutubeVideoList, updateVideoList, updateErrorMessage, updateInfoMessage);
	}, [])

	useEffect(() => {
		const fetchData = async () => {
			if (urlValue.length !== 0 && (urlValue.includes("https://www.youtube.com/watch") || urlValue.includes("https://www.youtube.com/shorts"))) {
				console.log("Fetching YouTube video data...");

				try {
					let response = await axios.get(`https://youtube-video-download-express-server-1.onrender.com/download?url=${urlValue}`);
					let data = response.data;

					updateYoutubeVideoList(data);
				} catch (error) {
					console.error("Error fetching YouTube video data:", error);
				}
			}
		};

		fetchData();
	}, [urlValue]);

	return (
		<div>
			{window === "Youtube" && (
				<div>
					<h1><span style={{ color: "red" }}>Youtube</span> Video Downloader</h1>
					{youtubevideoList && youtubevideoList.info.map((formatName: any, index: any) => (
						<div key={index}>
							<LinkCard formatName={formatName} />
						</div>
					))}
					{!urlValue.includes("https://www.youtube.com/watch") && (
						<div style={{ fontSize: '1.5em' }}>
							<p>ℹ️ This tab isn't a Youtube Video page</p>
						</div>
					)}
				</div>
			)}
			{window === "Twitter" && (
				<div style={{
					margin: '1rem',
				}}>
					<h1><span style={{ color: 'rgb(var(--twitter-color-blue))' }}>Twitter</span> Video Downloader</h1>
					{infoMessage != null && (
						<div style={{ fontSize: '1.5em' }}>
							<p>{infoMessage}</p>
						</div>
					)}
					{errorMessage != null && (
						<div>
							<p><strong>Error</strong>: {errorMessage}</p>
							<p>To report this error so it gets fixed as quickly as possible, DM <a href="https://twitter.com/zelcon" target="_blank">@zelcon on Twitter</a> and copy paste the error you see above.</p>
						</div>
					)}
					<div>
						<VideoList videos={videoList} />
					</div>
				</div>
			)}
			{!window && (
				<div>
					<h1>Welcome to Downloader</h1>
				</div>
			)}
		</div>
	)
}

function getWindowType(url: string) {
	if (url.includes("https://www.youtube.com")) {
		return "Youtube";
	} else if (url.includes("https://twitter.com")) {
		return "Twitter";
	}
	return null;
}

function VideoList({ videos }: VideoListProps) {
	return (
		<>
			<ul style={{
				'padding': '0',
				'margin': '0',
			}}>
				{videos.map((value: VideoItem, idx: number) => (
					<li key={"video_card_" + idx} style={{
						padding: '0 0 1em 0',
						margin: '0',
						listStyle: 'none',
					}}>
						<VideoCard key={"video_card_" + idx} video={value} />
					</li>
				))}
			</ul>
		</>
	);
}

function VideoCard({ video }: VideoCardProps) {
	const kbps = video.bitrate / 1000;
	const mbps = video.bitrate / 1_000_000;
	let bitrateBlock: h.JSX.Element | null = null;
	if (mbps < 1) {
		bitrateBlock = <>{kbps} kb/s</>;
	} else {
		bitrateBlock = <>{mbps} mb/s</>;
	}
	const videoFilename = video.url.split('/').pop().split('?')[0];
	return (
		<div style={{
			display: 'flex',
			flexFlow: 'row wrap',
			justifyContent: 'flex-start',
			alignItems: 'stretch',
			columnGap: '5vw',
		}}>
			<div>
				<video
					autoPlay={false}
					controls={true}
					preload="metadata"
					loop={true}
					poster={video.posterUrl}
					style={{
						borderRadius: '1em',
						maxWidth: '50vw',
					}}
				>
					<source src={video.url} type={video.contentType} />
				</video>
			</div>
			<div style={{
				display: 'flex',
				flexFlow: 'column wrap',
				justifyContent: 'space-evenly',
			}}>
				{video.bitrate > 0 && (<div>Quality: {bitrateBlock}</div>)}
				<div>Aspect ratio: {video.aspectRatio.x} x {video.aspectRatio.y}</div>
				<div>
					<a
						href={video.url}
						target="_blank"
						title="Open in new tab"
					>
						Open in new tab
					</a>
				</div>
				<div>
					<a
						href={video.url}
						style={{ textDecoration: 'none' }}
						title="Download video"
						onClick={async (e) => {
							e.preventDefault();
							fetch(video.url).then((r) => r.blob()).then((blob) => {
								const fr = new FileReader();
								fr.addEventListener('load', () => {
									if (typeof fr.result !== 'string') {
										throw new Error();
									}
									const a = document.createElement('a');
									a.href = fr.result as string;
									a.download = video.url.split('/').pop().split('?')[0];
									document.body.appendChild(a);
									a.click();
									document.body.removeChild(a);
								});
								fr.readAsDataURL(blob);
							});
						}}
					>
						Download video
					</a>
				</div>
			</div>
		</div>
	);
}

interface VideoCardProps {
	video: VideoItem;
}

interface VideoListProps {
	videos: VideoItem[];
}

function appMessaging(urlValue, updateYoutubeVideoList, updateVideoList: StateUpdater<VideoItem[]>, updateErrorMessage: StateUpdater<string | null>, updateInfoMessage: StateUpdater<string | null>): () => void {
	const port = chrome.runtime.connect();
	let initialMessage: Message = {
		type: 'SETUP_TWITTER_ENVIRONMENT',
		payload: {},
	};
	port.postMessage(initialMessage);
	port.onMessage.addListener(function (msg: Message, port: chrome.runtime.Port) {
		switch (msg.type) {
			case 'COMPLETE_TWITTER_ENVIRONMENT_SETUP': {
				const { twtrEnv } = msg.payload as CompleteTwitterEnvironmentSetupPayload;
				const payload: RequestTwitterVideosPayload = {
					twtrEnv,
				};
				const request: Message = {
					type: 'REQUEST_TWITTER_VIDEOS',
					payload,
				};
				port.postMessage(request);
				break;
			}
			case 'RECEIVE_TWITTER_VIDEOS': {
				const payload = msg.payload as ReceiveTwitterVideosPayload;
				const { videos } = payload;
				updateVideoList(videos);
				port.disconnect();
				break;
			}
			case 'RECEIVE_ERROR_MESSAGE': {
				const payload = msg.payload as ReceiveErrorMessagePayload;
				console.error(`Error ${payload.errorName || ''}: ${payload.errorMessage || ''}`);
				updateErrorMessage(payload.errorMessage);
				port.disconnect();
				break;
			}
			case 'RECEIVE_INFO_MESSAGE': {
				const payload = msg.payload as ReceiveInfoMessagePayload;
				switch (payload.name) {
					case 'TabNotFoundError': {
						updateInfoMessage(`ℹ️ This tab isn't a Twitter post`);
						break;
					}
					case 'TwitterNotLoggedInError': {
						updateInfoMessage(`ℹ️ Log in to Twitter first`);
						break;
					}
					case 'VideosNotFound': {
						updateInfoMessage(`ℹ️ No videos found here`);
						break;
					}
					default:
						console.warn(`unrecognized info message:  ${payload.name}`);
						updateInfoMessage(`ℹ️ ${payload.message}`);
				}
				port.disconnect();
				break;
			}
			default: {
				console.error(`Unrecognized message passed to popup.js: ${JSON.stringify(msg)}`);
			}
		}
	});

	return () => {
		port.disconnect();
	}
}

const LinkCard = ({ formatName }: any) => {
	let video = formatName

	const kbps = video.bitrate / 1000;
	const mbps = video.bitrate / 1_000_000;
	let bitrateBlock: h.JSX.Element | null = null;
	if (mbps < 1) {
		bitrateBlock = <>{kbps} kb/s</>;
	} else {
		bitrateBlock = <>{mbps} mb/s</>;
	}
	const videoFilename = video.url.split('/').pop().split('?')[0];
	return (
		<div style={{
			display: 'flex',
			flexFlow: 'row wrap',
			justifyContent: 'flex-start',
			alignItems: 'stretch',
			columnGap: '5vw',
		}}>
			<div>
				<video
					autoPlay={false}
					controls={true}
					preload="metadata"
					loop={true}
					poster={video.posterUrl}
					style={{
						borderRadius: '1em',
						maxWidth: '50vw',
					}}
				>
					<source src={video.url} type={video.contentType} />
				</video>
			</div>
			<div style={{
				display: 'flex',
				flexFlow: 'column wrap',
				justifyContent: 'space-evenly',
			}}>
				{video.bitrate > 0 && (<div>Quality: {bitrateBlock}</div>)}
				<div>Aspect ratio: {video.width} x {video.height}</div>
				<div>
					<a
						href={video.url}
						target="_blank"
						title="Open in new tab"
					>
						Open in new tab
					</a>
				</div>
				<div>
					<a
						href={video.url}
						style={{ textDecoration: 'none' }}
						title="Download video"
						onClick={async (e) => {
							e.preventDefault();
							fetch(
								`http://localhost:4000/download?url=${video.url}`,
								// `https://youtube-video-download-express-server-1.onrender.com/download?url=${video.url}`
							)
								.then((r) => r.blob()).then((blob) => {
									const fr = new FileReader();
									fr.addEventListener('load', () => {
										if (typeof fr.result !== 'string') {
											throw new Error();
										}
										const a = document.createElement('a');
										a.href = fr.result as string;
										a.download = video.url.split('/').pop().split('?')[0];
										document.body.appendChild(a);
										a.click();
										document.body.removeChild(a);
									});
									fr.readAsDataURL(blob);
								});
						}}
					>
						Download video
					</a>
				</div>
			</div>
		</div>
	);
};

