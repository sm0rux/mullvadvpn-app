package net.mullvad.mullvadvpn.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import net.mullvad.mullvadvpn.R
import net.mullvad.mullvadvpn.model.Settings
import net.mullvad.mullvadvpn.ui.widget.CellSwitch
import net.mullvad.mullvadvpn.ui.widget.ToggleCell

class PreferencesFragment : ServiceDependentFragment(OnNoService.GoBack) {
    private lateinit var allowLanToggle: ToggleCell
    private lateinit var autoConnectToggle: ToggleCell
    private lateinit var titleController: CollapsibleTitleController

    override fun onSafelyCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val view = inflater.inflate(R.layout.preferences, container, false)

        view.findViewById<View>(R.id.back).setOnClickListener {
            parentActivity.onBackPressed()
        }

        allowLanToggle = view.findViewById<ToggleCell>(R.id.allow_lan).apply {
            listener = { state ->
                when (state) {
                    CellSwitch.State.ON -> settingsListener.allowLan = true
                    CellSwitch.State.OFF -> settingsListener.allowLan = false
                }
            }
        }

        autoConnectToggle = view.findViewById<ToggleCell>(R.id.auto_connect).apply {
            listener = { state ->
                when (state) {
                    CellSwitch.State.ON -> settingsListener.autoConnect = true
                    CellSwitch.State.OFF -> settingsListener.autoConnect = false
                }
            }
        }

        settingsListener.settingsNotifier.subscribe(this) { maybeSettings ->
            maybeSettings?.let { settings ->
                updateUi(settings)
            }
        }

        titleController = CollapsibleTitleController(view)

        return view
    }

    override fun onSafelyDestroyView() {
        titleController.onDestroy()
        settingsListener.settingsNotifier.unsubscribe(this)
    }

    private fun updateUi(settings: Settings) {
        jobTracker.newUiJob("updateUi") {
            val allowLanState = boolToSwitchState(settings.allowLan)
            val autoConnectState = boolToSwitchState(settings.autoConnect)

            if (isVisible) {
                allowLanToggle.state = allowLanState
                autoConnectToggle.state = autoConnectState
            } else {
                allowLanToggle.forcefullySetState(allowLanState)
                autoConnectToggle.forcefullySetState(autoConnectState)
            }
        }
    }

    private fun boolToSwitchState(pref: Boolean): CellSwitch.State {
        if (pref) {
            return CellSwitch.State.ON
        } else {
            return CellSwitch.State.OFF
        }
    }
}
