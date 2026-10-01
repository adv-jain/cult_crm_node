import { useEffect, useState } from "react";

import {
  FiAlertCircle,
  FiFileText,
  FiX,
} from "react-icons/fi";

import api from "../../api";

import {
  initialForm,
  createEmptyDay,
  formatDateInput,
  buildDays,
  normalizePayload,
  getCustomerName,
  STATUS_OPTIONS,
} from "../../utils/itineraryUtils";

import {
  DayEditor,
  FieldLabel,
  Input,
  Select,
  Textarea,
  ListEditor,
} from "./DayEditor";

export default function ItineraryForm({
  open,
  onClose,
  editing,
  trips,
  customers,
  bookings,
  hotels,
  transports,
  onSaved,
}) {
  const [
    form,
    setForm,
  ] = useState(initialForm);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  // ===================================================
  // INITIALIZE FORM
  // ===================================================

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow =
      "hidden";

    if (editing) {
      const startDate =
        formatDateInput(
          editing.startDate
        );

      const endDate =
        formatDateInput(
          editing.endDate
        );

      setForm({
        itineraryNumber:
          editing.itineraryNumber ||
          "",

        title:
          editing.title ||
          "",

        trip:
          editing.trip?._id ||
          editing.trip ||
          "",

        booking:
          editing.booking?._id ||
          editing.booking ||
          "",

        customer:
          editing.customer?._id ||
          editing.customer ||
          "",

        destination:
          editing.destination ||
          "",

        startDate,

        endDate,

        status:
          editing.status ||
          "Draft",

        days: buildDays(
          startDate,
          endDate,
          editing.days || []
        ),

        inclusions:
          editing.inclusions ||
          [],

        exclusions:
          editing.exclusions ||
          [],

        importantNotes:
          editing.importantNotes ||
          [],

        emergencyContact: {
          name:
            editing
              .emergencyContact
              ?.name ||
            "",

          phone:
            editing
              .emergencyContact
              ?.phone ||
            "",

          email:
            editing
              .emergencyContact
              ?.email ||
            "",
        },

        notes:
          editing.notes ||
          "",
      });
    } else {
      setForm({
        ...initialForm,

        days: [
          createEmptyDay(1),
        ],
      });
    }

    setError("");

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [
    open,
    editing,
  ]);

  // ===================================================
  // ESCAPE KEY
  // ===================================================

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key ===
          "Escape" &&
        !saving
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [
    open,
    saving,
    onClose,
  ]);

  // ===================================================
  // REBUILD DAYS WHEN DATES CHANGE
  // ===================================================

  useEffect(() => {
    if (!form.startDate)
      return;

    setForm(
      (current) => ({
        ...current,

        days: buildDays(
          current.startDate,
          current.endDate,
          current.days
        ),
      })
    );
  }, [
    form.startDate,
    form.endDate,
  ]);

  // ===================================================
  // FORM UPDATE
  // ===================================================

  const updateForm = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };

  // ===================================================
  // EMERGENCY CONTACT UPDATE
  // ===================================================

  const updateEmergency = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,

        emergencyContact: {
          ...current.emergencyContact,

          [field]: value,
        },
      })
    );
  };

  // ===================================================
  // DAY UPDATE
  // ===================================================

  const updateDay = (
    index,
    value
  ) => {
    setForm(
      (current) => {
        const days = [
          ...current.days,
        ];

        days[index] =
          value;

        return {
          ...current,
          days,
        };
      }
    );
  };

  // ===================================================
  // TRIP CHANGE
  // ===================================================

  const handleTripChange =
    (tripId) => {
      const selectedTrip =
        trips.find(
          (trip) =>
            trip._id ===
            tripId
        );

      setForm(
        (current) => ({
          ...current,

          trip: tripId,

          customer:
            selectedTrip
              ?.customer
              ?._id ||
            selectedTrip?.customer ||
            current.customer,

          destination:
            selectedTrip?.destination ||
            current.destination,

          startDate:
            selectedTrip?.startDate
              ? formatDateInput(
                  selectedTrip.startDate
                )
              : current.startDate,

          endDate:
            selectedTrip?.endDate
              ? formatDateInput(
                  selectedTrip.endDate
                )
              : current.endDate,
        })
      );
    };

  // ===================================================
  // SUBMIT
  // ===================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");

      // TITLE
      if (
        !form.title.trim()
      ) {
        setError(
          "Itinerary title is required."
        );

        return;
      }

      // TRIP
      if (!form.trip) {
        setError(
          "Please select a trip."
        );

        return;
      }

      // DESTINATION
      if (
        !form.destination.trim()
      ) {
        setError(
          "Destination is required."
        );

        return;
      }

      // DATE VALIDATION
      if (
        form.startDate &&
        form.endDate &&
        new Date(
          form.endDate
        ) <
          new Date(
            form.startDate
          )
      ) {
        setError(
          "End date cannot be before start date."
        );

        return;
      }

      try {
        setSaving(true);

        const payload =
          normalizePayload(
            form
          );

        // UPDATE
        if (
          editing?._id
        ) {
          await api.put(
            `/itineraries/${editing._id}`,
            payload
          );
        }

        // CREATE
        else {
          await api.post(
            "/itineraries",
            payload
          );
        }

        await onSaved();

        onClose();
      } catch (err) {
        setError(
          err?.response?.data
            ?.message ||
            "Unable to save itinerary. Please try again."
        );
      } finally {
        setSaving(false);
      }
    };

  if (!open) return null;

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]">

      <div className="w-full max-w-[900px] max-h-[92vh] bg-white rounded-2xl shadow-2xl shadow-gray-900/20 flex flex-col overflow-hidden">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">

          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {editing
                ? "Edit Itinerary"
                : "Create Itinerary"}
            </h2>

            <p className="text-xs text-gray-400 mt-0.5">
              Build a complete day-wise travel plan.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              saving
            }
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <FiX
              size={18}
            />
          </button>

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={
            handleSubmit
          }
          className="flex-1 overflow-y-auto"
        >

          <div className="px-5 py-4">

            {/* ERROR */}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2.5 rounded-lg mb-4 flex items-start gap-2">

                <FiAlertCircle className="mt-0.5 shrink-0" />

                <span>
                  {error}
                </span>

              </div>
            )}

            <div className="space-y-6">

              {/* =================================================
                  BASIC INFORMATION
              ================================================= */}

              <section>

                <div className="flex items-center gap-2 mb-3">

                  <FiFileText className="text-blue-500" />

                  <h3 className="text-sm font-semibold text-gray-800">
                    Basic Information
                  </h3>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                  {/* TITLE */}

                  <div>
                    <FieldLabel required>
                      Title
                    </FieldLabel>

                    <Input
                      value={
                        form.title
                      }
                      onChange={(
                        e
                      ) =>
                        updateForm(
                          "title",
                          e.target
                            .value
                        )
                      }
                      placeholder="7 Days Manali Family Tour"
                    />
                  </div>

                  {/* ITINERARY NUMBER */}

                  <div>
                    <FieldLabel>
                      Itinerary Number
                    </FieldLabel>

                    <Input
                      value={
                        form.itineraryNumber ||
                        "Auto generated"
                      }
                      readOnly
                      className="text-gray-400 cursor-not-allowed"
                    />
                  </div>

                  {/* TRIP */}

                  <div>
                    <FieldLabel required>
                      Trip
                    </FieldLabel>

                    <Select
                      value={
                        form.trip
                      }
                      onChange={(
                        e
                      ) =>
                        handleTripChange(
                          e.target
                            .value
                        )
                      }
                    >

                      <option value="">
                        Select trip
                      </option>

                      {trips.map(
                        (trip) => (
                          <option
                            key={
                              trip._id
                            }
                            value={
                              trip._id
                            }
                          >
                            {trip.tripCode
                              ? `${trip.tripCode} — ${trip.title}`
                              : trip.title}
                          </option>
                        )
                      )}

                    </Select>
                  </div>

                  {/* BOOKING */}

                  <div>
                    <FieldLabel>
                      Booking
                    </FieldLabel>

                    <Select
                      value={
                        form.booking
                      }
                      onChange={(e) =>
                        updateForm(
                          "booking",
                          e.target
                            .value
                        )
                      }
                    >

                      <option value="">
                        Select booking
                      </option>

                      {bookings.map(
                        (
                          booking
                        ) => (
                          <option
                            key={
                              booking._id
                            }
                            value={
                              booking._id
                            }
                          >
                            {booking.bookingCode ||
                              booking.title ||
                              booking._id}
                          </option>
                        )
                      )}

                    </Select>
                  </div>

                  {/* CUSTOMER */}

                  <div>
                    <FieldLabel>
                      Customer
                    </FieldLabel>

                    <Select
                      value={
                        form.customer
                      }
                      onChange={(e) =>
                        updateForm(
                          "customer",
                          e.target
                            .value
                        )
                      }
                    >

                      <option value="">
                        Select customer
                      </option>

                      {customers.map(
                        (
                          customer
                        ) => (
                          <option
                            key={
                              customer._id
                            }
                            value={
                              customer._id
                            }
                          >
                            {getCustomerName(
                              customer
                            )}
                          </option>
                        )
                      )}

                    </Select>
                  </div>

                  {/* DESTINATION */}

                  <div>
                    <FieldLabel required>
                      Destination
                    </FieldLabel>

                    <Input
                      value={
                        form.destination
                      }
                      onChange={(e) =>
                        updateForm(
                          "destination",
                          e.target
                            .value
                        )
                      }
                      placeholder="Manali"
                    />
                  </div>

                  {/* START DATE */}

                  <div>
                    <FieldLabel>
                      Start Date
                    </FieldLabel>

                    <Input
                      type="date"
                      value={
                        form.startDate
                      }
                      onChange={(e) =>
                        updateForm(
                          "startDate",
                          e.target
                            .value
                        )
                      }
                    />
                  </div>

                  {/* END DATE */}

                  <div>
                    <FieldLabel>
                      End Date
                    </FieldLabel>

                    <Input
                      type="date"
                      value={
                        form.endDate
                      }
                      onChange={(e) =>
                        updateForm(
                          "endDate",
                          e.target
                            .value
                        )
                      }
                    />
                  </div>

                  {/* STATUS */}

                  <div>
                    <FieldLabel>
                      Status
                    </FieldLabel>

                    <Select
                      value={
                        form.status
                      }
                      onChange={(e) =>
                        updateForm(
                          "status",
                          e.target
                            .value
                        )
                      }
                    >

                      {STATUS_OPTIONS.map(
                        (
                          status
                        ) => (
                          <option
                            key={
                              status
                            }
                            value={
                              status
                            }
                          >
                            {status}
                          </option>
                        )
                      )}

                    </Select>
                  </div>

                </div>
              </section>

              {/* =================================================
                  DAY-WISE ITINERARY
              ================================================= */}

              <section>

                <div className="flex items-center gap-2 mb-3">

                  <FiFileText className="text-purple-500" />

                  <h3 className="text-sm font-semibold text-gray-800">
                    Day-wise Itinerary
                  </h3>

                </div>

                <div className="space-y-3">

                  {form.days.map(
                    (
                      day,
                      index
                    ) => (
                      <DayEditor
                        key={
                          day.dayNumber
                        }
                        day={
                          day
                        }
                        index={
                          index
                        }
                        onChange={(
                          value
                        ) =>
                          updateDay(
                            index,
                            value
                          )
                        }
                        hotels={
                          hotels
                        }
                        transports={
                          transports
                        }
                      />
                    )
                  )}

                </div>
              </section>

              {/* =================================================
                  INCLUSIONS / EXCLUSIONS / NOTES
              ================================================= */}

              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <ListEditor
                  label="Inclusions"
                  values={
                    form.inclusions
                  }
                  onChange={(
                    value
                  ) =>
                    updateForm(
                      "inclusions",
                      value
                    )
                  }
                  placeholder="Airport transfers"
                />

                <ListEditor
                  label="Exclusions"
                  values={
                    form.exclusions
                  }
                  onChange={(
                    value
                  ) =>
                    updateForm(
                      "exclusions",
                      value
                    )
                  }
                  placeholder="Personal expenses"
                />

                <ListEditor
                  label="Important Notes"
                  values={
                    form.importantNotes
                  }
                  onChange={(
                    value
                  ) =>
                    updateForm(
                      "importantNotes",
                      value
                    )
                  }
                  placeholder="Carry ID proof"
                />

              </section>

              {/* =================================================
                  EMERGENCY CONTACT
              ================================================= */}

              <section>

                <div className="flex items-center gap-2 mb-3">

                  <FiAlertCircle className="text-orange-500" />

                  <h3 className="text-sm font-semibold text-gray-800">
                    Emergency Contact
                  </h3>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                  {/* NAME */}

                  <div>
                    <FieldLabel>
                      Name
                    </FieldLabel>

                    <Input
                      value={
                        form
                          .emergencyContact
                          .name
                      }
                      onChange={(e) =>
                        updateEmergency(
                          "name",
                          e.target
                            .value
                        )
                      }
                      placeholder="Emergency contact"
                    />
                  </div>

                  {/* PHONE */}

                  <div>
                    <FieldLabel>
                      Phone
                    </FieldLabel>

                    <Input
                      value={
                        form
                          .emergencyContact
                          .phone
                      }
                      onChange={(e) =>
                        updateEmergency(
                          "phone",
                          e.target
                            .value
                        )
                      }
                      placeholder="+91 9876543210"
                    />
                  </div>

                  {/* EMAIL */}

                  <div>
                    <FieldLabel>
                      Email
                    </FieldLabel>

                    <Input
                      type="email"
                      value={
                        form
                          .emergencyContact
                          .email
                      }
                      onChange={(e) =>
                        updateEmergency(
                          "email",
                          e.target
                            .value
                        )
                      }
                      placeholder="contact@example.com"
                    />
                  </div>

                </div>
              </section>

              {/* =================================================
                  ADDITIONAL NOTES
              ================================================= */}

              <section>

                <FieldLabel>
                  Additional Notes
                </FieldLabel>

                <Textarea
                  rows={4}
                  value={
                    form.notes
                  }
                  onChange={(e) =>
                    updateForm(
                      "notes",
                      e.target
                        .value
                    )
                  }
                  placeholder="Any additional information for the traveller..."
                />

              </section>

            </div>
          </div>

          {/* =================================================
              FOOTER ACTIONS
          ================================================= */}

          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">

            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                saving
              }
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving
              }
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
            >

              {saving && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}

              {saving
                ? "Saving..."
                : editing
                ? "Update Itinerary"
                : "Create Itinerary"}

            </button>

          </div>

        </form>
      </div>
    </div>
  );
}